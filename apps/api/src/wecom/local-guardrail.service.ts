import { Injectable } from "@nestjs/common";
import vard from "@andersmyrmel/vard";
import { SensitiveWordTool } from "sensitive-word-tool";
import { createHash } from "node:crypto";

export type LocalGuardrailCategory = "allowed" | "prompt_injection" | "sensitive_content" | "privacy" | "secret" | "health_risk" | "invalid";

export interface LocalGuardrailResult {
  allowed: boolean;
  category: LocalGuardrailCategory;
  reason: string;
  sanitizedText: string;
  matches: string[];
  preview: string;
  contentHash: string;
}

const maxInputLength = Number(process.env.LOCAL_GUARDRAIL_MAX_INPUT_LENGTH ?? 3000);

const chinesePromptInjectionRules: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /(显示|输出|告诉|泄露|发给我).{0,16}(系统提示词|开发者指令|内部指令|system prompt|system message)/i, reason: "检测到索要系统提示词的越权请求" },
  { pattern: /(系统提示词|开发者指令|内部指令|system prompt|system message).{0,24}(显示|输出|告诉|泄露|发给我|发给|完整)/i, reason: "检测到索要系统提示词的越权请求" },
  { pattern: /忽略.{0,12}(之前|上面|以上|所有).{0,12}(规则|指令|要求|提示词)/i, reason: "检测到忽略既有规则的提示词注入" },
  { pattern: /(无视|不要遵守|绕过).{0,16}(系统|安全|规则|限制|要求|指令)/i, reason: "检测到绕过系统规则的提示词注入" },
  { pattern: /(你现在|从现在开始).{0,12}(不是|扮演|作为).{0,20}(医生|黑客|管理员|系统|开发者)/i, reason: "检测到角色越权或角色操控请求" },
  { pattern: /(以管理员身份|进入管理员模式|开发者模式|DAN模式|越狱模式)/i, reason: "检测到越权模式请求" }
];

const healthRiskRules: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /(胸痛|胸闷|呼吸困难|晕厥|昏厥|剧烈头痛)/i, reason: "检测到急性健康风险" },
  { pattern: /(处方|药物|用药|停药|剂量|胰岛素|降压药|抗凝药)/i, reason: "检测到药物或处方相关风险" },
  { pattern: /(怀孕|孕期|产后|术后|手术后|骨折|韧带断裂)/i, reason: "检测到孕产、术后或损伤相关风险" },
  { pattern: /(一周|7天|七天).{0,10}(瘦|减).{0,8}(10斤|十斤|20斤|二十斤|暴瘦)/i, reason: "检测到极端减重风险" }
];

const piiRules: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b1[3-9]\d{9}\b/, label: "手机号" },
  { pattern: /\b\d{6}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/, label: "身份证号" },
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, label: "邮箱" }
];

const secretRules: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/, label: "OpenAI-compatible API key" },
  { pattern: /\b(?:api[_-]?key|secret|token|access[_-]?token)\s*[:=]\s*[A-Za-z0-9._-]{12,}\b/i, label: "密钥或 token" }
];

const sensitiveWords = [
  "破解",
  "入侵",
  "木马",
  "病毒",
  "攻击脚本",
  "撞库",
  "盗号",
  "赌博",
  "洗钱",
  "毒品",
  "枪支",
  "爆炸物",
  "色情",
  "裸聊"
];

@Injectable()
export class LocalGuardrailService {
  private readonly promptGuard = vard
    .moderate()
    .maxLength(maxInputLength)
    .delimiters(["SYSTEM:", "USER:", "ASSISTANT:", "DEVELOPER:", "<system>", "</system>", "[SYSTEM]", "[USER]"])
    .block("instructionOverride")
    .block("roleManipulation")
    .block("systemPromptLeak")
    .sanitize("delimiterInjection")
    .sanitize("encoding");

  private readonly sensitiveTool = new SensitiveWordTool({
    useDefaultWords: true,
    wordList: sensitiveWords.concat(splitEnvList(process.env.LOCAL_GUARDRAIL_EXTRA_WORDS))
  });

  checkInput(text: string): LocalGuardrailResult {
    return this.check(text, "input");
  }

  checkOutput(text: string): LocalGuardrailResult {
    return this.check(text, "output");
  }

  private check(text: string, direction: "input" | "output"): LocalGuardrailResult {
    const trimmed = text.trim();
    const normalized = normalizeText(text);
    if (!normalized) return this.block("invalid", "输入内容为空", [], text);
    if (normalized.length > maxInputLength) return this.block("invalid", `输入内容超过 ${maxInputLength} 字符限制`, [], text);

    const secretMatch = firstMatch(normalized, secretRules);
    if (secretMatch) return this.block("secret", `检测到疑似${secretMatch}`, [secretMatch], text);

    const piiMatch = firstMatch(normalized, piiRules);
    if (piiMatch) return this.block("privacy", `检测到疑似${piiMatch}`, [piiMatch], text);

    const promptInjection = chinesePromptInjectionRules.find((rule) => rule.pattern.test(normalized));
    if (promptInjection) return this.block("prompt_injection", promptInjection.reason, [promptInjection.reason], text);

    const vardResult = this.promptGuard.safeParse(normalized);
    if (!vardResult.safe) {
      return this.block(
        "prompt_injection",
        `Vard 检测到提示词注入风险：${vardResult.threats.map((threat) => threat.type).join(", ")}`,
        vardResult.threats.map((threat) => `${threat.type}:${threat.match}`),
        text
      );
    }

    const healthRisk = healthRiskRules.find((rule) => rule.pattern.test(normalized));
    if (healthRisk) return this.block("health_risk", healthRisk.reason, [healthRisk.reason], text);

    const sensitiveMatches = this.sensitiveTool.match(normalized);
    if (sensitiveMatches.length > 0) {
      return this.block("sensitive_content", `检测到违禁或敏感内容：${sensitiveMatches.slice(0, 3).join("、")}`, sensitiveMatches, text);
    }

    return {
      allowed: true,
      category: "allowed",
      reason: direction === "input" ? "输入通过本地安全校验" : "输出通过本地安全校验",
      sanitizedText: trimmed,
      matches: [],
      preview: redactedPreview(text),
      contentHash: hashContent(text)
    };
  }

  private block(category: Exclude<LocalGuardrailCategory, "allowed">, reason: string, matches: string[], text: string): LocalGuardrailResult {
    return {
      allowed: false,
      category,
      reason,
      sanitizedText: "",
      matches,
      preview: redactedPreview(text),
      contentHash: hashContent(text)
    };
  }
}

function normalizeText(text: string): string {
  return text.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

function firstMatch(text: string, rules: Array<{ pattern: RegExp; label: string }>): string | null {
  for (const rule of rules) {
    if (rule.pattern.test(text)) return rule.label;
  }
  return null;
}

function splitEnvList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function redactedPreview(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_API_KEY]")
    .replace(/\b(?:api[_-]?key|secret|token|access[_-]?token)\s*[:=]\s*[A-Za-z0-9._-]{8,}\b/gi, "[REDACTED_SECRET]")
    .replace(/\b1[3-9]\d{9}\b/g, "[REDACTED_PHONE]")
    .replace(/\b\d{6}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g, "[REDACTED_ID]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .slice(0, 160);
}

function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
