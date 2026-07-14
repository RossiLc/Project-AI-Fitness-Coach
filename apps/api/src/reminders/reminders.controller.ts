import { Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { MemberRole, type ReminderTaskDto } from "@openfit/shared";
import { AllowRoles } from "../auth/role-guard.factory.js";
import { RemindersService } from "./reminders.service.js";

@Controller("admin/reminders")
export class RemindersController {
  constructor(@Inject(RemindersService) private readonly reminders: RemindersService) {}

  @Get()
  @UseGuards(AllowRoles(MemberRole.ActivityAdmin, MemberRole.OrgAdmin))
  async list(): Promise<ReminderTaskDto[]> {
    return this.reminders.list();
  }

  @Post("demo-task")
  @UseGuards(AllowRoles(MemberRole.ActivityAdmin, MemberRole.OrgAdmin))
  createDemoTask() {
    return this.reminders.createDemoManualTask();
  }

  @Post("scan")
  @UseGuards(AllowRoles(MemberRole.ActivityAdmin, MemberRole.OrgAdmin))
  scanMissing() {
    return this.reminders.scanMissingForDate();
  }

  @Post("group-missing-checkins")
  @UseGuards(AllowRoles(MemberRole.ActivityAdmin, MemberRole.OrgAdmin))
  sendGroupMissingCheckins() {
    return this.reminders.sendGroupMissingCheckinReminder();
  }

  @Post(":id/retry")
  @UseGuards(AllowRoles(MemberRole.ActivityAdmin, MemberRole.OrgAdmin))
  retry(@Param("id") id: string) {
    return this.reminders.retry(id);
  }

  @Post(":id/send-personal")
  @UseGuards(AllowRoles(MemberRole.ActivityAdmin, MemberRole.OrgAdmin))
  sendPersonal(@Param("id") id: string) {
    return this.reminders.sendPersonalReminder(id);
  }
}
