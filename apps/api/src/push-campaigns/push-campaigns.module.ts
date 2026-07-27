import { Module } from "@nestjs/common";
import { WeComModule } from "../wecom/wecom.module.js";
import { PushCampaignsController } from "./push-campaigns.controller.js";
import { PushCampaignsService } from "./push-campaigns.service.js";

@Module({
  imports: [WeComModule],
  controllers: [PushCampaignsController],
  providers: [PushCampaignsService],
  exports: [PushCampaignsService]
})
export class PushCampaignsModule {}
