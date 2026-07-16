import { Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common";
import { MemberRole, type ReminderTaskDto } from "@openfit/shared";
import { AllowRoles } from "../auth/role-guard.factory.js";
import { RemindersService } from "./reminders.service.js";

@Controller("admin/reminders")
export class RemindersController {
  constructor(@Inject(RemindersService) private readonly reminders: RemindersService) {}

  @Get()
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  async list(): Promise<ReminderTaskDto[]> {
    return this.reminders.list();
  }

  @Post("demo-task")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  createDemoTask() {
    return this.reminders.createDemoManualTask();
  }

  @Post("scan")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  scanMissing() {
    return this.reminders.scanMissingForDate();
  }

  @Post("group-missing-checkins")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  sendGroupMissingCheckins(@Query("groupId") groupId?: string) {
    return this.reminders.sendGroupMissingCheckinReminder(groupId);
  }

  @Post(":id/retry")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  retry(@Param("id") id: string) {
    return this.reminders.retry(id);
  }

  @Post(":id/send-personal")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  sendPersonal(@Param("id") id: string) {
    return this.reminders.sendPersonalReminder(id);
  }
}
