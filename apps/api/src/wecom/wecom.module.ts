import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module.js";
import { CheckinsModule } from "../checkins/checkins.module.js";
import { LeaderboardsModule } from "../leaderboards/leaderboards.module.js";
import { MembersModule } from "../members/members.module.js";
import { GroupsModule } from "../groups/groups.module.js";
import { BotIntentRouterService } from "./bot-intent-router.service.js";
import { CoachSafetyService } from "./coach-safety.service.js";
import { LocalGuardrailService } from "./local-guardrail.service.js";
import { WeComBotService } from "./wecom-bot.service.js";
import { WeComConfigService } from "./wecom-config.service.js";
import { WeComStreamBotService } from "./wecom-stream-bot.service.js";
import { WeComController } from "./wecom.controller.js";
import { WeComMessageSender } from "./wecom-message.sender.js";
import { WeComService } from "./wecom.service.js";

@Module({
  imports: [AiModule, CheckinsModule, LeaderboardsModule, MembersModule, GroupsModule],
  controllers: [WeComController],
  providers: [WeComService, WeComMessageSender, WeComBotService, WeComStreamBotService, BotIntentRouterService, CoachSafetyService, LocalGuardrailService, WeComConfigService],
  exports: [WeComService, WeComMessageSender, WeComBotService, WeComStreamBotService, WeComConfigService]
})
export class WeComModule {}
