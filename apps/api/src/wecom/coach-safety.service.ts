import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { coachSystemPrompt, highRiskCoachKeywords } from "../ai/coach-guardrail.js";
import { LocalGuardrailService, type LocalGuardrailResult } from "./local-guardrail.service.js";

export interface CoachSafetyReply {
  riskLevel: "normal" | "escalate";
  text: string;
  tags: string[];
}

@Injectable()
export class CoachSafetyService {
  private readonly logger = new Logger(CoachSafetyService.name);

  constructor(@Optional() @Inject(LocalGuardrailService) private readonly localGuardrail: LocalGuardrailService = new LocalGuardrailService()) {}

  buildReply(text: string): CoachSafetyReply {
    const local = this.localGuardrail.checkInput(text);
    if (!local.allowed) return this.toSafetyReply(local, "input");

    if (highRiskCoachKeywords.some((keyword) => text.includes(keyword))) {
      return {
        riskLevel: "escalate",
        text: "这个问题可能涉及健康风险，我不能在群里给出诊断、治疗或处方建议。请先停止高强度运动，并尽快寻求医生或专业帮助。",
        tags: ["health_risk"]
      };
    }

    return {
      riskLevel: "normal",
      text: "",
      tags: []
    };
  }

  validateOutput(text: string): CoachSafetyReply {
    const local = this.localGuardrail.checkOutput(text);
    this.logModelReply(local, text);
    if (!local.allowed && local.category === "health_risk" && this.isSafeHealthOutput(text)) {
      return {
        riskLevel: "normal",
        text,
        tags: ["health_risk_context_allowed"]
      };
    }
    if (!local.allowed) return this.toSafetyReply(local, "output");

    if (highRiskCoachKeywords.some((keyword) => text.includes(keyword)) && !this.isSafeHealthOutput(text)) {
      return {
        riskLevel: "escalate",
        text: "AI 回复触发健康安全策略，已替换为安全提示：涉及身体异常、用药、孕产、术后或急性症状时，请咨询医生或专业人士。",
        tags: ["health_risk", "output_blocked"]
      };
    }

    return {
      riskLevel: "normal",
      text,
      tags: []
    };
  }

  buildSystemPrompt(): string {
    return coachSystemPrompt;
  }

  private toSafetyReply(result: LocalGuardrailResult, direction: "input" | "output"): CoachSafetyReply {
    this.logBlocked(result, direction);

    if (direction === "output") {
      return {
        riskLevel: "escalate",
        text: "AI 回复触发安全策略，已停止发送。请换一种不包含敏感信息、密钥或越权内容的问法。",
        tags: [result.category, "output_blocked"]
      };
    }

    if (result.category === "prompt_injection") {
      return {
        riskLevel: "escalate",
        text: "这条消息触发了 AI 安全规则，不能要求机器人忽略规则、泄露系统提示词或切换越权角色。请直接提问运动、饮食或活动规则相关问题。",
        tags: [result.category]
      };
    }

    if (result.category === "sensitive_content") {
      return {
        riskLevel: "escalate",
        text: "这条消息包含违禁或敏感内容，不适合由 AI 教练处理。请改为咨询运动、饮食、活动规则或排行榜相关问题。",
        tags: [result.category]
      };
    }

    if (result.category === "privacy" || result.category === "secret") {
      return {
        riskLevel: "escalate",
        text: "这条消息可能包含个人敏感信息或密钥，请删除身份证号、手机号、邮箱、token、secret 等内容后再提问。",
        tags: [result.category]
      };
    }

    if (result.category === "health_risk") {
      return {
        riskLevel: "escalate",
        text: "这个问题可能涉及健康风险，我不能在群里给出诊断、治疗或处方建议。请先停止高强度运动，并尽快寻求医生或专业帮助。",
        tags: [result.category]
      };
    }

    return {
      riskLevel: "escalate",
      text: "这条消息未通过本地安全校验，请换一种更明确、低风险的问法。",
      tags: [result.category]
    };
  }

  private logBlocked(result: LocalGuardrailResult, direction: "input" | "output") {
    this.logger.warn(
      JSON.stringify({
        event: "coach_guardrail_blocked",
        direction,
        category: result.category,
        reason: result.reason,
        matches: result.matches.slice(0, 5),
        contentHash: result.contentHash,
        preview: result.preview
      })
    );
  }

  private logModelReply(result: LocalGuardrailResult, text: string) {
    this.logger.debug(
      JSON.stringify({
        event: "coach_model_reply_received",
        direction: "output",
        category: result.category,
        allowed: result.allowed,
        contentLength: text.length,
        contentHash: result.contentHash,
        preview: result.preview
      })
    );
  }

  private isSafeHealthOutput(text: string): boolean {
    const normalized = text.normalize("NFKC");
    const hasBoundary =
      /(不建议|避免|停止|暂停|停下来|先停|不要|别硬练|降强度|咨询医生|就医|专业人士|非医疗建议|不是医疗建议|运动有度|身体反馈优先|异常及时停止|明显不舒服)/i.test(
        normalized
      );
    const hasUnsafeDirective = /(继续|坚持|可以).{0,12}(高强度|剧烈|冲刺|硬撑|忍着|带病|胸痛|呼吸困难)/i.test(normalized);
    return hasBoundary && !hasUnsafeDirective;
  }
}
