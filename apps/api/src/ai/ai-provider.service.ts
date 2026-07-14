import { Inject, Injectable } from "@nestjs/common";
import type { AiImageCheckinParseInput, CoachAdviceResponse, RecognitionResultDto } from "@openfit/shared";
import { AiConfigService } from "./ai-config.service.js";
import { coachSystemPrompt } from "./coach-guardrail.js";

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

@Injectable()
export class AiProviderService {
  constructor(@Inject(AiConfigService) private readonly configService: AiConfigService) {}

  async generateCoachAdvice(question: string): Promise<CoachAdviceResponse> {
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
          { role: "user", content: question }
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
    if (config.mockMode || !config.baseUrl || !config.apiKey) {
      return fallbackParse(text, config.mockMode ? "AI mock 解析，需用户确认。" : "AI 未配置，使用本地降级解析，需用户确认。");
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
            content: "你是运动打卡文本解析器。只返回 JSON：sportType,durationMin,distanceKm,intensity,calorieEstimate,confidence,notice。"
          },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) return fallbackParse(text, `AI 解析失败 HTTP ${response.status}，使用本地降级解析，需用户确认。`);

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return fallbackParse(text, "AI 未返回有效解析，使用本地降级解析，需用户确认。");

    try {
      const parsed = JSON.parse(content) as Partial<RecognitionResultDto>;
      return {
        sportType: parsed.sportType ?? "general",
        durationMin: parsed.durationMin ?? 30,
        distanceKm: parsed.distanceKm,
        intensity: parsed.intensity ?? "moderate",
        calorieEstimate: parsed.calorieEstimate,
        confidence: parsed.confidence ?? 0.72,
        notice: parsed.notice ?? "AI 解析结果需用户确认，热量仅供活动统计参考。"
      };
    } catch {
      return fallbackParse(text, "AI 返回内容无法解析，使用本地降级解析，需用户确认。");
    }
  }

  async parseCheckinImage(input: AiImageCheckinParseInput): Promise<RecognitionResultDto> {
    const config = this.configService.getConfig();
    if (config.mockMode || !config.baseUrl || !config.apiKey) {
      return fallbackParse(input.textHint || "图片识别 跑步 30 分钟", config.mockMode ? "AI 图片识别 mock 结果，需用户确认。" : "AI 未配置，使用图片识别降级结果，需用户确认。");
    }

    const imageUrls = input.attachments
      .map((attachment) => attachment.url ?? (attachment.base64Data ? `data:${attachment.mimeType ?? "image/jpeg"};base64,${attachment.base64Data}` : undefined))
      .filter((value): value is string => Boolean(value));
    const imageRefs = input.attachments
      .map((attachment) => attachment.url ?? attachment.mediaId ?? attachment.fileId ?? attachment.filename)
      .filter(Boolean)
      .join(", ");
    const userContent =
      imageUrls.length > 0
        ? [
            { type: "text", text: `文字提示：${input.textHint || "无"}。请识别这张运动打卡图片。` },
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
            content: "你是运动打卡图片识别器。根据图片和可选文字提示推断运动类型、时长、距离、强度和热量，只返回 JSON：sportType,durationMin,distanceKm,intensity,calorieEstimate,confidence,notice。"
          },
          { role: "user", content: userContent }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) return fallbackParse(input.textHint || "图片识别 跑步 30 分钟", `AI 图片识别失败 HTTP ${response.status}，使用降级结果，需用户确认。`);

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return fallbackParse(input.textHint || "图片识别 跑步 30 分钟", "AI 图片识别未返回有效内容，使用降级结果，需用户确认。");

    try {
      const parsed = JSON.parse(content) as Partial<RecognitionResultDto>;
      return {
        sportType: parsed.sportType ?? "general",
        durationMin: parsed.durationMin ?? 30,
        distanceKm: parsed.distanceKm,
        intensity: parsed.intensity ?? "moderate",
        calorieEstimate: parsed.calorieEstimate,
        confidence: parsed.confidence ?? 0.7,
        notice: parsed.notice ?? "AI 图片识别结果需用户确认，热量仅供活动统计参考。"
      };
    } catch {
      return fallbackParse(input.textHint || "图片识别 跑步 30 分钟", "AI 图片识别返回内容无法解析，使用降级结果，需用户确认。");
    }
  }
}

function fallbackParse(text: string, notice: string): RecognitionResultDto {
  const durationMin = Number(text.match(/(\d+(?:\.\d+)?)\s*(分钟|min)/i)?.[1] ?? 30);
  const distanceMatch = text.match(/(\d+(?:\.\d+)?)\s*(公里|km|千米)/i);
  const distanceKm = distanceMatch?.[1] ? Number(distanceMatch[1]) : undefined;
  const sportType = text.includes("跑") ? "running" : text.includes("走") ? "walking" : text.includes("骑") ? "cycling" : "general";
  const intensity = text.includes("累") || text.includes("冲刺") ? "high" : text.includes("轻松") ? "low" : "moderate";
  return {
    sportType,
    durationMin,
    distanceKm,
    intensity,
    calorieEstimate: Math.round(durationMin * (sportType === "running" ? 8.5 : sportType === "cycling" ? 6.5 : 5)),
    confidence: distanceKm ? 0.82 : 0.68,
    notice
  };
}
