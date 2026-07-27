import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { MemberRole, type CreatePushCampaignRequest, type CurrentUser, type UpdatePushCampaignRequest } from "@openfit/shared";
import { CurrentUserDecorator } from "../auth/current-user.decorator.js";
import { AllowRoles } from "../auth/role-guard.factory.js";
import { PushCampaignsService } from "./push-campaigns.service.js";

@Controller()
export class PushCampaignsController {
  constructor(@Inject(PushCampaignsService) private readonly campaigns: PushCampaignsService) {}

  @Get("admin/push-campaigns")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  list(@CurrentUserDecorator() user: CurrentUser, @Query("groupId") groupId?: string) {
    return this.campaigns.list(user.orgId, groupId);
  }

  @Post("admin/push-campaigns")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  create(@CurrentUserDecorator() user: CurrentUser, @Body() body: CreatePushCampaignRequest) {
    return this.campaigns.create(user.orgId, body);
  }

  @Put("admin/push-campaigns/:id")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  update(@CurrentUserDecorator() user: CurrentUser, @Param("id") id: string, @Body() body: UpdatePushCampaignRequest) {
    return this.campaigns.update(user.orgId, id, body);
  }

  @Post("admin/push-campaigns/:id/send-now")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  sendNow(@CurrentUserDecorator() user: CurrentUser, @Param("id") id: string) {
    return this.campaigns.sendNow(user.orgId, id);
  }

  @Delete("admin/push-campaigns/:id")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  delete(@CurrentUserDecorator() user: CurrentUser, @Param("id") id: string) {
    return this.campaigns.delete(user.orgId, id);
  }

  @Post("internal/push-campaigns/dispatch-due")
  dispatchDue() {
    return this.campaigns.dispatchDue();
  }
}
