import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module.js";
import { AdminCheckinsController } from "./admin-checkins.controller.js";
import { AdminCheckinsService } from "./admin-checkins.service.js";
import { CheckinsController } from "./checkins.controller.js";
import { CheckinsService } from "./checkins.service.js";
import { RuleRecognizerService } from "./rule-recognizer.service.js";

@Module({
  imports: [AiModule],
  controllers: [CheckinsController, AdminCheckinsController],
  providers: [CheckinsService, RuleRecognizerService, AdminCheckinsService],
  exports: [CheckinsService, RuleRecognizerService, AdminCheckinsService]
})
export class CheckinsModule {}
