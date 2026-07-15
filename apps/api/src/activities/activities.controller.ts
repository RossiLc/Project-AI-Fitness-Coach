import { Body, Controller, Get, Inject, Param, Post, Put, UseGuards } from "@nestjs/common";
import { MemberRole, type CreateActivityConfigRequest, type CurrentUser, type UpdateActivityConfigRequest } from "@openfit/shared";
import { CurrentUserDecorator } from "../auth/current-user.decorator.js";
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
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  async getCurrentConfig() {
    return this.activities.getCurrentConfig();
  }

  @Get("configs")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  async listConfigs(@CurrentUserDecorator() user: CurrentUser) {
    return this.activities.listConfigs(user.orgId);
  }

  @Post("configs")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  async createConfig(@CurrentUserDecorator() user: CurrentUser, @Body() body: CreateActivityConfigRequest) {
    return this.activities.createConfig(user.orgId, body);
  }

  @Put(":id/config")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  async updateConfig(@Param("id") id: string, @Body() body: UpdateActivityConfigRequest) {
    return this.activities.updateConfig(id, body);
  }
}
