import { Inject, Injectable, Optional } from "@nestjs/common";
import { ApiErrorCode, ReminderStatus, type GroupMissingCheckinReminderResult, type ReminderTaskDto } from "@openfit/shared";
import { ApiException } from "../common/api-response.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { WeComMessageSender } from "../wecom/wecom-message.sender.js";

type MissingMemberForReminder = {
  id: string;
  displayName: string;
  wecomUserid?: string | null;
};

type GroupReminderArgs = {
  groupId?: string;
  date: Date;
};

@Injectable()
export class RemindersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
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
    if (!activity) {
      throw new ApiException(ApiErrorCode.ActivityNotActive, "当前没有进行中的活动，无法生成提醒任务");
    }

    const member = await this.prisma.member.findFirst({ where: { orgId: activity.orgId, status: "active" } });
    if (!member) {
      throw new ApiException(ApiErrorCode.ActivityNotActive, "当前没有可提醒成员，请先通过群管理导入成员名册");
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
            lastError: "已生成未打卡提醒任务，等待管理员处理"
          },
          create: {
            id: `reminder_${activity.id}_${member.id}_${key}`,
            activityId: activity.id,
            memberId: member.id,
            remindDate: date,
            channel: "web_manual",
            status: ReminderStatus.Manual,
            lastError: "已生成未打卡提醒任务，等待管理员处理"
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

    return this.prisma.reminderTask.update({
      where: { id },
      data: {
        status: ReminderStatus.Manual,
        attemptCount: { increment: 1 },
        lastError: "当前不支持个人定向提醒，请使用群提醒未打卡"
      }
    });
  }

  async sendGroupMissingCheckinReminder(groupIdOrDate?: string | Date, maybeDate = new Date()): Promise<GroupMissingCheckinReminderResult> {
    const args = normalizeGroupReminderArgs(groupIdOrDate, maybeDate);
    const { activity, group, missingMembers, key } = await this.findMissingMembers(args.date, args.groupId);
    const message = this.buildGroupMissingCheckinMessage(missingMembers);
    const result = group?.chatId ? await this.wecomSender?.sendMarkdownToChat(group.chatId, message) : await this.wecomSender?.sendMarkdown(message);

    return {
      activityId: activity.id,
      date: key,
      missingCount: missingMembers.length,
      mode: result?.mode ?? "intelligent_bot",
      ok: result?.ok ?? false,
      message: result?.message ?? "企业微信群消息发送服务不可用"
    };
  }

  private async findMissingMembers(date: Date, groupId?: string) {
    const group = groupId ? await this.prisma.weComGroup.findFirst({ where: { id: groupId, status: "active" } }) : null;
    if (groupId && !group) throw new ApiException("WECOM_GROUP_NOT_FOUND", "企业微信群不存在或尚未完成绑定", 404);
    if (group && !group.chatId) throw new ApiException("WECOM_GROUP_NOT_BOUND", "企业微信群尚未绑定 chatid，请先在目标群里发送绑定口令", 400);

    const activity = await this.prisma.activity.findFirst({ where: { status: "active", ...(groupId ? { groupId } : {}) }, orderBy: { startAt: "desc" } });
    if (!activity) throw new ApiException(ApiErrorCode.ActivityNotActive, "当前没有进行中的活动");

    const members = groupId
      ? (
          await this.prisma.weComGroupMember.findMany({
            where: { groupId, status: "active" },
            include: { member: true }
          })
        ).map((item) => ({
          id: item.memberId,
          displayName: item.member.displayName ?? item.displayName,
          wecomUserid: item.member.wecomUserid ?? item.wecomUserid
        }))
      : await this.prisma.member.findMany({
          where: { orgId: activity.orgId, status: "active" },
          select: { id: true, displayName: true, wecomUserid: true }
        });
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
      group,
      missingMembers: members.filter((member) => !submittedMemberIds.has(member.id)),
      key
    };
  }

  private buildGroupMissingCheckinMessage(missingMembers: MissingMemberForReminder[]): string {
    const memberLines = missingMembers.length > 0 ? missingMembers.map((member, index) => `${index + 1}. ${this.formatMissingMember(member)}`) : ["今日所有成员都已完成打卡。"];

    return [
      "Open Fit 打卡提醒",
      "",
      `今日还有 ${missingMembers.length} 位成员未完成打卡。`,
      "",
      "未打卡成员：",
      ...memberLines,
      "",
      "请以上同事通过 Open Fit 打卡助手提交“打卡文字内容 + 图片”完成今日打卡。"
    ].join("\n");
  }

  private formatMissingMember(member: MissingMemberForReminder): string {
    if (member.wecomUserid?.trim()) return `<@${member.wecomUserid}>（${member.displayName}）`;
    return `${member.displayName}（未绑定企业微信 userid）`;
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

function normalizeGroupReminderArgs(groupIdOrDate?: string | Date, maybeDate = new Date()): GroupReminderArgs {
  if (groupIdOrDate instanceof Date) return { date: groupIdOrDate };
  return { groupId: groupIdOrDate, date: maybeDate };
}
