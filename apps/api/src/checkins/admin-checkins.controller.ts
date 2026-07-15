import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { MemberRole, type CurrentUser, type InvalidateCheckinRequest } from "@openfit/shared";
import { CurrentUserDecorator } from "../auth/current-user.decorator.js";
import { AllowRoles } from "../auth/role-guard.factory.js";
import { AdminCheckinsService } from "./admin-checkins.service.js";

@Controller("admin/checkins")
@UseGuards(AllowRoles(MemberRole.OrgAdmin))
export class AdminCheckinsController {
  constructor(@Inject(AdminCheckinsService) private readonly adminCheckins: AdminCheckinsService) {}

  @Get()
  list() {
    return this.adminCheckins.list();
  }

  @Post(":id/invalidate")
  invalidate(@CurrentUserDecorator() user: CurrentUser, @Param("id") id: string, @Body() body: InvalidateCheckinRequest) {
    return this.adminCheckins.invalidate(user, id, body.reason);
  }

  @Post(":id/restore")
  restore(@CurrentUserDecorator() user: CurrentUser, @Param("id") id: string) {
    return this.adminCheckins.restore(user, id);
  }
}
