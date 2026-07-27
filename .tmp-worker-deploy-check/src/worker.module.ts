import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PushCampaignDispatcher } from "./push-campaigns/push-campaign-dispatcher.js";
import { WeComMessageProcessor } from "./wecom/wecom-message.processor.js";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] })],
  providers: [WeComMessageProcessor, PushCampaignDispatcher]
})
export class WorkerModule {}
