import { Body, Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common";
import { MemberRole, type WeComAppMessageRequest, type WeComOAuthCallbackRequest } from "@openfit/shared";
import { AllowRoles } from "../auth/role-guard.factory.js";
import { MembersService } from "../members/members.service.js";
import { WeComAppService } from "./wecom-app.service.js";

@Controller()
export class WeComAppController {
  constructor(
    @Inject(WeComAppService) private readonly app: WeComAppService,
    @Inject(MembersService) private readonly members: MembersService
  ) {}

  @Get("admin/wecom/app/status")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  status() {
    return this.app.getStatus();
  }

  @Get("auth/wecom/login-url")
  loginUrl(@Query("state") state?: string) {
    return this.app.buildOAuthLoginUrl(state);
  }

  @Post("auth/wecom/callback")
  callback(@Body() body: WeComOAuthCallbackRequest) {
    return this.app.handleOAuthCallback(body, this.members);
  }

  @Post("admin/wecom/app-message")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  sendAppMessage(@Body() body: WeComAppMessageRequest) {
    return this.app.sendAppMessage(body);
  }
}
