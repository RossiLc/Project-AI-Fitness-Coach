import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { MemberRole, type CreateWeComGroupRequest, type CurrentUser, type ImportGroupMembersByNameRequest } from "@openfit/shared";
import { CurrentUserDecorator } from "../auth/current-user.decorator.js";
import { AllowRoles } from "../auth/role-guard.factory.js";
import { GroupsService } from "./groups.service.js";

@Controller("admin/groups")
@UseGuards(AllowRoles(MemberRole.OrgAdmin))
export class GroupsController {
  constructor(@Inject(GroupsService) private readonly groups: GroupsService) {}

  @Get()
  list(@CurrentUserDecorator() user: CurrentUser) {
    return this.groups.list(user.orgId);
  }

  @Post()
  create(@CurrentUserDecorator() user: CurrentUser, @Body() body: CreateWeComGroupRequest) {
    return this.groups.create(user.orgId, body.name);
  }

  @Post(":id/import-members")
  importMembers(@CurrentUserDecorator() user: CurrentUser, @Param("id") id: string, @Body() body: ImportGroupMembersByNameRequest) {
    return this.groups.importMembersByNames(user.orgId, id, body.namesText);
  }
}
