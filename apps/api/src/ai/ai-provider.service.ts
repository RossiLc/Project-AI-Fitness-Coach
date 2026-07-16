import { Inject, Injectable } from "@nestjs/common";
import type { AiImageCheckinParseInput, CoachAdviceResponse, RecognitionResultDto } from "@openfit/shared";
import { AiConfigService } from "./ai-config.service.js";
import { coachSystemPrompt } from "./coach-guardrail.js";

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export type CoachChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

@Injectable()
export class AiProviderService {
  constructor(@Inject(AiConfigService) private readonly configService: AiConfigService) {}

  async generateCoachAdvice(question: string): Promise<CoachAdviceResponse> {
    return this.generateCoachAdviceWithMessages([{ role: "user", content: question }]);
  }

  async generateCoachAdviceWithMessages(messages: CoachChatMessage[]): Promise<CoachAdviceResponse> {
    const config = this.configService.getConfig();
    if (!config.baseUrl || !config.apiKey) {
      return {
        riskLevel: "normal",
        answer: "AI 服务尚未配置，当前无法生成真实 AI 教练回复。请在服务端配置 AI_BASE_URL 和 AI_API_KEY 后重试。",
        model: config.model,
        source: "unconfigured"
      };
    }

    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: coachSystemPrompt
          },
          ...messages
        ]
      })
    });

    if (!response.ok) {
      return {
        riskLevel: "normal",
        answer: `AI 模型调用失败：HTTP ${response.status}。请稍后重试，或联系管理员检查 AI_BASE_URL、AI_API_KEY 和模型配置。`,
        model: config.model,
        source: "model_error"
      };
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return {
        riskLevel: "normal",
        answer: "AI 模型未返回有效内容，请稍后重试。",
        model: config.model,
        source: "model_error"
      };
    }

    return {
      riskLevel: "normal",
      answer: content,
      model: config.model,
      source: "model"
    };
  }

  async parseCheckinText(text: string): Promise<RecognitionResultDto> {
    const config = this.configService.getConfig();
    if (!config.baseUrl || !config.apiKey) {
      throw new Error("AI_CHECKIN_PARSER_UNCONFIGURED");
    }

    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: "你是运动打卡文本解析器。只返回 JSON：sportType,durationMin,distanceKm,intensity,calorieEstimate,confidence,notice。sportType 必须使用中文运动类型，例如跑步、爬坡、骑行、快走、力量训练。不要使用 general/running/cycling 这类英文枚举。"
          },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) throw new Error(`AI_CHECKIN_PARSER_FAILED:${response.status}`);

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI_CHECKIN_PARSER_EMPTY_RESPONSE");

    try {
      const parsed = parseJsonObject(content) as Partial<RecognitionResultDto>;
      return {
        sportType: parsed.sportType ?? "",
        durationMin: parsed.durationMin ?? 0,
        distanceKm: parsed.distanceKm,
        intensity: parsed.intensity ?? "moderate",
        calorieEstimate: parsed.calorieEstimate,
        confidence: parsed.confidence ?? 0.72,
        notice: parsed.notice ?? "AI 解析结果需用户确认，热量仅供活动统计参考。"
      };
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error("AI_CHECKIN_PARSER_INVALID_JSON");
      throw error;
    }
  }

  async parseCheckinImage(input: AiImageCheckinParseInput): Promise<RecognitionResultDto> {
    const config = this.configService.getConfig();
    if (!config.baseUrl || !config.apiKey) {
      throw new Error("AI_CHECKIN_IMAGE_PARSER_UNCONFIGURED");
    }

    const imageUrls = input.attachments
      .map((attachment) => (attachment.base64Data ? `data:${attachment.mimeType ?? "image/jpeg"};base64,${attachment.base64Data}` : attachment.url))
      .filter((value): value is string => Boolean(value));
    const imageRefs = input.attachments
      .map((attachment) => attachment.url ?? attachment.mediaId ?? attachment.fileId ?? attachment.filename)
      .filter(Boolean)
      .join(", ");
    const userContent =
      imageUrls.length > 0
        ? [
            {
              type: "text",
              text:
                `文字提示：${input.textHint || "无"}。请基于图片 OCR 和文字语义识别运动打卡数据。` +
                "如果图片中已经展示运动时长、热量或运动类型，必须优先使用图片中的数值，不要自行估算覆盖。sportType 必须使用中文运动类型，例如爬坡、跑步、骑行、快走、力量训练。"
            },
            ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } }))
          ]
        : `文字提示：${input.textHint || "无"}\n图片引用：${imageRefs || "企业微信图片附件"}`;
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content:
              "你是运动打卡图片识别器。根据图片 OCR 和可选文字提示提取运动类型、时长、距离、强度和热量，只返回 JSON：sportType,durationMin,distanceKm,intensity,calorieEstimate,confidence,notice。" +
              "字段要求：sportType 必须是中文运动类型；durationMin 为分钟整数；calorieEstimate 为千卡整数。若图片明确展示总消耗热量，优先使用总消耗热量；若只有活动热量，则使用活动热量并在 notice 说明。不要返回 general/running/cycling 等英文枚举，不要在缺少依据时用固定默认值。"
          },
          { role: "user", content: userContent }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) throw new Error(`AI_CHECKIN_IMAGE_PARSER_FAILED:${response.status}`);

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI_CHECKIN_IMAGE_PARSER_EMPTY_RESPONSE");

    try {
      const parsed = parseJsonObject(content) as Partial<RecognitionResultDto>;
      return {
        sportType: parsed.sportType ?? "",
        durationMin: parsed.durationMin ?? 0,
        distanceKm: parsed.distanceKm,
        intensity: parsed.intensity ?? "moderate",
        calorieEstimate: parsed.calorieEstimate,
        confidence: parsed.confidence ?? 0.7,
        notice: parsed.notice ?? "AI 图片识别结果需用户确认，热量仅供活动统计参考。"
      };
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error("AI_CHECKIN_IMAGE_PARSER_INVALID_JSON");
      throw error;
    }
  }
}

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();
  if (trimmed.startsWith("```")) {
    const json = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    return JSON.parse(json);
  }
  return JSON.parse(trimmed);
}
