import { Module } from "@nestjs/common";
import { AiConfigService } from "./ai-config.service.js";
import { AiProviderService } from "./ai-provider.service.js";
import { AiCheckinParserService } from "./ai-checkin-parser.service.js";
import { CoachConversationService } from "./coach-conversation.service.js";
import { CoachController } from "./coach.controller.js";
import { CoachService } from "./coach.service.js";
import { CoachSafetyService } from "../wecom/coach-safety.service.js";
import { LocalGuardrailService } from "../wecom/local-guardrail.service.js";

@Module({
  controllers: [CoachController],
  providers: [AiConfigService, AiProviderService, AiCheckinParserService, CoachConversationService, CoachService, CoachSafetyService, LocalGuardrailService],
  exports: [AiConfigService, AiProviderService, AiCheckinParserService, CoachConversationService, CoachService]
})
export class AiModule {}
