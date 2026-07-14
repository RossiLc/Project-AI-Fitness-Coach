import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common";
import { MemberRole, type BindWeComUseridRequest, type CurrentUser } from "@openfit/shared";
import { CurrentUserDecorator } from "../auth/current-user.decorator.js";
import { AllowRoles } from "../auth/role-guard.factory.js";
import { MembersService } from "./members.service.js";

@Controller("admin/members")
@UseGuards(AllowRoles(MemberRole.ActivityAdmin, MemberRole.OrgAdmin))
export class MembersController {
  constructor(@Inject(MembersService) private readonly members: MembersService) {}

  @Get()
  list(@CurrentUserDecorator() user: CurrentUser, @Query("missingToday") missingToday?: string) {
    return this.members.list(user.orgId, { missingToday: missingToday === "true" });
  }

  @Get(":id/checkins")
  getCheckinHistory(@CurrentUserDecorator() user: CurrentUser, @Param("id") id: string) {
    return this.members.getCheckinHistory(user.orgId, id);
  }

  @Post(":id/wecom-userid")
  bindWeComUserid(@CurrentUserDecorator() user: CurrentUser, @Param("id") id: string, @Body() body: BindWeComUseridRequest) {
    return this.members.bindWeComUserid(user.id, id, body.wecomUserid);
  }

  @Post("sync/wecom")
  sync(@CurrentUserDecorator() user: CurrentUser) {
    return this.members.syncFromWeComMock(user.orgId);
  }
}
