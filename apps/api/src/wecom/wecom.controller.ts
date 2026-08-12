import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { MemberRole, type CurrentUser, type WeComDirectMessageRequest, type WeComTestMessageRequest } from "@openfit/shared";
import { CurrentUserDecorator } from "../auth/current-user.decorator.js";
import { AllowRoles } from "../auth/role-guard.factory.js";
import { WeComService } from "./wecom.service.js";

@Controller("admin/wecom")
export class WeComController {
  constructor(@Inject(WeComService) private readonly wecom: WeComService) {}

  @Post("test-message")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  testMessage(@CurrentUserDecorator() user: CurrentUser, @Body() body: WeComTestMessageRequest) {
    return this.wecom.sendTestMessage(user, body);
  }

  @Post("daily-tip")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  dailyTip(@CurrentUserDecorator() user: CurrentUser) {
    return this.wecom.sendDailyTip(user);
  }

  @Post("weekly-leaderboard")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  weeklyLeaderboard(@CurrentUserDecorator() user: CurrentUser) {
    return this.wecom.sendWeeklyLeaderboard(user);
  }

  @Post("direct-message")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  directMessage(@CurrentUserDecorator() user: CurrentUser, @Body() body: WeComDirectMessageRequest) {
    return this.wecom.sendDirectMessage(user, body);
  }
}
