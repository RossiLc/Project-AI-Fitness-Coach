import { Inject, Injectable } from "@nestjs/common";
import type { CoachAdviceResponse } from "@openfit/shared";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { CoachSafetyService } from "../wecom/coach-safety.service.js";
import { AiProviderService } from "./ai-provider.service.js";

@Injectable()
export class CoachService {
  constructor(
    @Inject(AiProviderService) private readonly provider: AiProviderService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CoachSafetyService) private readonly safety: CoachSafetyService
  ) {}

  async advise(question: string): Promise<CoachAdviceResponse> {
    const inputSafety = this.safety.buildReply(question);
    if (inputSafety.riskLevel === "escalate") {
      const response = this.safetyResponse(inputSafety.text);
      await this.recordLog(question, response, inputSafety.tags);
      return response;
    }

    const modelResponse = await this.provider.generateCoachAdvice(question);
    const outputSafety = this.safety.validateOutput(modelResponse.answer);
    if (outputSafety.riskLevel === "escalate") {
      const response = this.safetyResponse(outputSafety.text);
      await this.recordLog(question, response, outputSafety.tags);
      return response;
    }

    await this.recordLog(question, modelResponse, inputSafety.tags);
    return modelResponse;
  }

  private safetyResponse(answer: string): CoachAdviceResponse {
    return {
      riskLevel: "escalate",
      answer,
      model: "local-guardrail",
      source: "safety_template"
    };
  }

  private async recordLog(question: string, response: CoachAdviceResponse, riskTags: string[] = []) {
    await this.prisma.coachAdviceLog.create({
      data: {
        memberId: null,
        channel: "web",
        riskLevel: response.riskLevel,
        riskTags: riskTags as Prisma.InputJsonValue,
        questionHash: createHash("sha256").update(question).digest("hex"),
        responseSummary: response.answer.slice(0, 120)
      }
    });
  }
}
