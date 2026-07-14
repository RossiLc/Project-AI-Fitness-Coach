import { Inject, Injectable, Optional } from "@nestjs/common";
import { ApiErrorCode, ReminderStatus, type GroupMissingCheckinReminderResult, type ReminderTaskDto } from "@openfit/shared";
import { ApiException } from "../common/api-response.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { WeComAppService } from "../wecom/wecom-app.service.js";
import { WeComMessageSender } from "../wecom/wecom-message.sender.js";

@Injectable()
export class RemindersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(WeComAppService) private readonly wecomApp?: WeComAppService,
    @Optional() @Inject(WeComMessageSender) private readonly wecomSender?: WeComMessageSender
  ) {}

  async list(): Promise<ReminderTaskDto[]> {
    const tasks = await this.prisma.reminderTask.findMany({
      include: { member: true },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return tasks.map((task) => ({
      id: task.id,
      memberName: task.member.displayName,
      remindDate: task.remindDate.toISOString(),
      channel: task.channel as ReminderTaskDto["channel"],
      status: task.status as ReminderTaskDto["status"],
      attemptCount: task.attemptCount,
      lastError: task.lastError ?? undefined
    }));
  }

  async createDemoManualTask() {
    const activity = await this.prisma.activity.findFirst({ where: { status: "active" }, orderBy: { startAt: "desc" } });
    const member = await this.prisma.member.findFirst({ where: { id: "employee_demo" } });
    if (!activity || !member) {
      throw new ApiException(ApiErrorCode.ActivityNotActive, "缺少示例活动或成员，无法生成提醒任务");
    }

    return this.prisma.reminderTask.upsert({
      where: { id: "reminder_demo_generated" },
      update: {
        status: ReminderStatus.Manual,
        lastError: "手动触发生成的示例提醒任务"
      },
      create: {
        id: "reminder_demo_generated",
        activityId: activity.id,
        memberId: member.id,
        remindDate: new Date(),
        channel: "web_manual",
        status: ReminderStatus.Manual,
        lastError: "手动触发生成的示例提醒任务"
      }
    });
  }

  async scanMissingForDate(date = new Date()) {
    const activity = await this.prisma.activity.findFirst({ where: { status: "active" }, orderBy: { startAt: "desc" } });
    if (!activity) throw new ApiException(ApiErrorCode.ActivityNotActive, "当前没有进行中的活动");

    const members = await this.prisma.member.findMany({ where: { orgId: activity.orgId, status: "active" } });
    const { start, end, key } = getDayRange(date);
    const submitted = await this.prisma.checkin.findMany({
      where: {
        activityId: activity.id,
        status: { in: ["submitted", "corrected"] },
        submittedAt: { gte: start, lt: end }
      },
      select: { memberId: true }
    });
    const submittedMemberIds = new Set(submitted.map((item) => item.memberId));
    const missingMembers = members.filter((member) => !submittedMemberIds.has(member.id));

    await Promise.all(
      missingMembers.map((member) =>
        this.prisma.reminderTask.upsert({
          where: { id: `reminder_${activity.id}_${member.id}_${key}` },
          update: {
            status: ReminderStatus.Manual,
            lastError: "自建应用消息未接入，降级为 Web 人工处理"
          },
          create: {
            id: `reminder_${activity.id}_${member.id}_${key}`,
            activityId: activity.id,
            memberId: member.id,
            remindDate: date,
            channel: "web_manual",
            status: ReminderStatus.Manual,
            lastError: "自建应用消息未接入，降级为 Web 人工处理"
          }
        })
      )
    );

    return { activityId: activity.id, date: key, created: missingMembers.length, status: ReminderStatus.Manual };
  }

  async retry(id: string) {
    return this.prisma.reminderTask.update({
      where: { id },
      data: {
        status: ReminderStatus.Eligible,
        attemptCount: { increment: 1 },
        lastError: null
      }
    });
  }

  async sendPersonalReminder(id: string) {
    const task = await this.prisma.reminderTask.findFirst({
      where: { id },
      include: { member: true }
    });
    if (!task) throw new ApiException("REMINDER_TASK_NOT_FOUND", "提醒任务不存在", 404);
    if (!task.member.wecomUserid) {
      return this.prisma.reminderTask.update({
        where: { id },
        data: {
          status: ReminderStatus.Manual,
          lastError: "成员未绑定企业微信 userid，无法发送个人提醒"
        }
      });
    }

    const result = await this.wecomApp?.sendAppMessage({
      toUserId: task.member.wecomUserid,
      text: `Open Fit 提醒：${task.member.displayName}，今天还没有有效打卡，请完成今日运动记录。`
    });

    return this.prisma.reminderTask.update({
      where: { id },
      data: {
        status: result?.ok ? ReminderStatus.Sent : ReminderStatus.Failed,
        attemptCount: { increment: 1 },
        lastError: result?.ok ? null : result?.message ?? "自建应用消息服务不可用"
      }
    });
  }

  async sendGroupMissingCheckinReminder(date = new Date()): Promise<GroupMissingCheckinReminderResult> {
    const { activity, missingMembers, key } = await this.findMissingMembers(date);
    const message = [
      "Open Fit 打卡提醒",
      "",
      `今日还有 ${missingMembers.length} 位成员未完成打卡。`,
      "请还未打卡的同事通过 Open Fit 打卡助手提交“打卡文字内容 + 图片”，并按机器人提示回复“确认”完成提交。"
    ].join("\n");
    const result = await this.wecomSender?.sendMarkdown(message);

    return {
      activityId: activity.id,
      date: key,
      missingCount: missingMembers.length,
      mode: result?.mode ?? "mock",
      ok: result?.ok ?? false,
      message: result?.message ?? "企业微信群机器人发送服务不可用"
    };
  }

  private async findMissingMembers(date: Date) {
    const activity = await this.prisma.activity.findFirst({ where: { status: "active" }, orderBy: { startAt: "desc" } });
    if (!activity) throw new ApiException(ApiErrorCode.ActivityNotActive, "当前没有进行中的活动");

    const members = await this.prisma.member.findMany({ where: { orgId: activity.orgId, status: "active" } });
    const { start, end, key } = getDayRange(date);
    const submitted = await this.prisma.checkin.findMany({
      where: {
        activityId: activity.id,
        status: { in: ["submitted", "corrected"] },
        submittedAt: { gte: start, lt: end }
      },
      select: { memberId: true }
    });
    const submittedMemberIds = new Set(submitted.map((item) => item.memberId));
    return {
      activity,
      missingMembers: members.filter((member) => !submittedMemberIds.has(member.id)),
      key
    };
  }
}

function getDayRange(date: Date) {
  const key = date.toISOString().slice(0, 10).replaceAll("-", "");
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end, key };
}
