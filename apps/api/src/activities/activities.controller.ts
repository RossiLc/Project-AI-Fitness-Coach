import { Body, Controller, Get, Inject, Param, Put, UseGuards } from "@nestjs/common";
import { MemberRole, type UpdateActivityConfigRequest } from "@openfit/shared";
import { AllowRoles } from "../auth/role-guard.factory.js";
import { ActivitiesService } from "./activities.service.js";

@Controller("activities")
export class ActivitiesController {
  constructor(@Inject(ActivitiesService) private readonly activities: ActivitiesService) {}

  @Get("current")
  async getCurrentActivity() {
    return this.activities.getCurrentActivity();
  }

  @Get("current/config")
  @UseGuards(AllowRoles(MemberRole.ActivityAdmin, MemberRole.OrgAdmin))
  async getCurrentConfig() {
    return this.activities.getCurrentConfig();
  }

  @Put(":id/config")
  @UseGuards(AllowRoles(MemberRole.ActivityAdmin, MemberRole.OrgAdmin))
  async updateConfig(@Param("id") id: string, @Body() body: UpdateActivityConfigRequest) {
    return this.activities.updateConfig(id, body);
  }
}
