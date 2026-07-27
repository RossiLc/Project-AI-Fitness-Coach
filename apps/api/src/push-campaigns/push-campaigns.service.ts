import { HttpStatus, Inject, Injectable, Optional } from "@nestjs/common";
import { ApiErrorCode, type CreatePushCampaignRequest, type DispatchDuePushCampaignsResult, type PushCampaignDto, type PushCampaignScheduleSlot, type PushCampaignScheduleType, type PushCampaignStatus, type UpdatePushCampaignRequest } from "@openfit/shared";
import { ApiException } from "../common/api-response.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { WeComMessageSender } from "../wecom/wecom-message.sender.js";

const PUSH_STATUS = {
  Draft: "draft" as PushCampaignStatus,
  Scheduled: "scheduled" as PushCampaignStatus,
  Sent: "sent" as PushCampaignStatus,
  Failed: "failed" as PushCampaignStatus
} as const;

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

type PushCampaignRow = {
  id: string;
  orgId: string;
  groupId: string;
  content: string;
  scheduleType?: string | null;
  scheduleSlot?: string | null;
  scheduleDate?: string | null;
  scheduledAt: Date | null;
  status: string;
  lastSentAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  group: {
    id: string;
    name: string;
    chatId: string | null;
  };
};

@Injectable()
export class PushCampaignsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(WeComMessageSender) private readonly wecomSender?: WeComMessageSender
  ) {}

  async list(orgId: string, groupId?: string): Promise<PushCampaignDto[]> {
    const campaigns = await this.prisma.pushCampaign.findMany({
      where: { orgId, ...(groupId ? { groupId } : {}) },
      include: { group: true },
      orderBy: { createdAt: "desc" }
    });
    return campaigns.map(toDto);
  }

  async create(orgId: string, body: CreatePushCampaignRequest, now = new Date()): Promise<PushCampaignDto> {
    const content = normalizeContent(body.content);
    await this.ensureGroup(orgId, body.groupId);
    const schedule = resolveSchedule(body.scheduleType, body.scheduleSlot, body.scheduleDate, now);
    const campaign = await this.prisma.pushCampaign.create({
      data: {
        orgId,
        groupId: body.groupId,
        content,
        scheduleType: schedule.type,
        scheduleSlot: schedule.slot,
        scheduleDate: schedule.date,
        scheduledAt: schedule.scheduledAt,
        status: schedule.scheduledAt ? PUSH_STATUS.Scheduled : PUSH_STATUS.Draft
      },
      include: { group: true }
    });
    return toDto(campaign);
  }

  async update(orgId: string, id: string, body: UpdatePushCampaignRequest, now = new Date()): Promise<PushCampaignDto> {
    const existing = await this.findOwnedCampaign(orgId, id);
    const nextGroupId = body.groupId ?? existing.groupId;
    await this.ensureGroup(orgId, nextGroupId);
    const hasScheduleChange = Object.prototype.hasOwnProperty.call(body, "scheduleType") || Object.prototype.hasOwnProperty.call(body, "scheduleSlot") || Object.prototype.hasOwnProperty.call(body, "scheduleDate");
    const schedule = hasScheduleChange
      ? resolveSchedule(body.scheduleType, body.scheduleSlot ?? undefined, body.scheduleDate ?? undefined, now)
      : {
          type: normalizeScheduleType(existing.scheduleType),
          slot: normalizeScheduleSlot(existing.scheduleSlot ?? undefined),
          date: existing.scheduleDate ?? null,
          scheduledAt: existing.scheduledAt
        };
    const content = body.content === undefined ? existing.content : normalizeContent(body.content);
    const campaign = await this.prisma.pushCampaign.update({
      where: { id },
      data: {
        groupId: nextGroupId,
        content,
        scheduleType: schedule.type,
        scheduleSlot: schedule.slot,
        scheduleDate: schedule.date,
        scheduledAt: schedule.scheduledAt,
        status: schedule.scheduledAt ? PUSH_STATUS.Scheduled : PUSH_STATUS.Draft,
        lastError: null
      },
      include: { group: true }
    });
    return toDto(campaign);
  }

  async sendNow(orgId: string, id: string): Promise<PushCampaignDto> {
    const campaign = await this.findOwnedCampaign(orgId, id);
    const result = await this.sendCampaign(campaign);
    if (result.status === PUSH_STATUS.Failed) {
      throw new ApiException(ApiErrorCode.PushCampaignSendFailed, result.lastError ?? "企业微信推送失败", HttpStatus.BAD_REQUEST, result);
    }
    return result;
  }

  async delete(orgId: string, id: string): Promise<{ id: string; deleted: true }> {
    await this.findOwnedCampaign(orgId, id);
    await this.prisma.pushCampaign.delete({ where: { id } });
    return { id, deleted: true };
  }

  async dispatchDue(now = new Date()): Promise<DispatchDuePushCampaignsResult> {
    const due = await this.prisma.pushCampaign.findMany({
      where: {
        status: PUSH_STATUS.Scheduled,
        scheduledAt: { lte: now }
      },
      include: { group: true },
      orderBy: { scheduledAt: "asc" },
      take: 50
    });

    let sent = 0;
    let failed = 0;
    for (const campaign of due) {
      const result = await this.sendCampaign(campaign, now);
      if (result.lastError) failed += 1;
      else sent += 1;
    }
    return { scanned: due.length, sent, failed };
  }

  private async ensureGroup(orgId: string, groupId: string) {
    if (!groupId?.trim()) throw new ApiException("PUSH_GROUP_REQUIRED", "请选择目标群");
    const group = await this.prisma.weComGroup.findFirst({ where: { id: groupId, orgId, status: { not: "archived" } } });
    if (!group) throw new ApiException("WECOM_GROUP_NOT_FOUND", "目标企业微信群不存在", 404);
    return group;
  }

  private async findOwnedCampaign(orgId: string, id: string): Promise<PushCampaignRow> {
    const campaign = await this.prisma.pushCampaign.findFirst({
      where: { id, orgId },
      include: { group: true }
    });
    if (!campaign) throw new ApiException("PUSH_CAMPAIGN_NOT_FOUND", "推送内容不存在", 404);
    return campaign;
  }

  private async sendCampaign(campaign: PushCampaignRow, now = new Date()): Promise<PushCampaignDto> {
    if (!campaign.group.chatId?.trim()) {
      return this.markFailed(campaign.id, "目标企业微信群尚未绑定 chatid，请先在群管理完成绑定。");
    }
    if (!this.wecomSender) {
      return this.markFailed(campaign.id, "企业微信智能机器人发送服务不可用。");
    }

    try {
      await this.wecomSender.sendMarkdownToChat(campaign.group.chatId, campaign.content);
      const data =
        campaign.scheduleType === "daily" && normalizeScheduleSlot(campaign.scheduleSlot)
          ? {
              status: PUSH_STATUS.Scheduled,
              scheduledAt: buildNextDailyScheduledAt(normalizeScheduleSlot(campaign.scheduleSlot)!, new Date(now.getTime() + 1000)),
              lastSentAt: now,
              lastError: null
            }
          : {
              status: PUSH_STATUS.Sent,
              scheduledAt: null,
              lastSentAt: now,
              lastError: null
            };
      const updated = await this.prisma.pushCampaign.update({
        where: { id: campaign.id },
        data,
        include: { group: true }
      });
      return toDto(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "企业微信推送失败";
      return this.markFailed(campaign.id, message);
    }
  }

  private async markFailed(id: string, reason: string): Promise<PushCampaignDto> {
    const updated = await this.prisma.pushCampaign.update({
      where: { id },
      data: {
        status: PUSH_STATUS.Failed,
        lastError: reason
      },
      include: { group: true }
    });
    return toDto(updated);
  }
}

function normalizeContent(content: string): string {
  const trimmed = content?.trim();
  if (!trimmed) throw new ApiException("PUSH_CONTENT_REQUIRED", "推送内容不能为空");
  return trimmed;
}

type ResolvedSchedule = {
  type: PushCampaignScheduleType;
  slot: PushCampaignScheduleSlot | null;
  date: string | null;
  scheduledAt: Date | null;
};

function resolveSchedule(type?: string | null, slot?: string | null, date?: string | null, now = new Date()): ResolvedSchedule {
  const scheduleType = normalizeScheduleType(type);
  if (scheduleType === "draft") return { type: "draft", slot: null, date: null, scheduledAt: null };
  const scheduleSlot = normalizeScheduleSlot(slot);
  if (!scheduleSlot) throw new ApiException("PUSH_SCHEDULE_SLOT_INVALID", "推送时间格式必须是 HH:mm，例如 09:00、12:00、18:00 或 08:30");
  if (scheduleType === "daily") {
    return { type: "daily", slot: scheduleSlot, date: null, scheduledAt: buildNextDailyScheduledAt(scheduleSlot, now) };
  }
  const scheduleDate = normalizeScheduleDate(date);
  return { type: "once", slot: scheduleSlot, date: scheduleDate, scheduledAt: buildBeijingDateTime(scheduleDate, scheduleSlot) };
}

function normalizeScheduleType(type?: string | null): PushCampaignScheduleType {
  if (!type || type === "draft") return "draft";
  if (type === "daily" || type === "once") return type;
  throw new ApiException("PUSH_SCHEDULE_TYPE_INVALID", "推送计划类型只支持每日推送或指定日期推送");
}

function normalizeScheduleSlot(slot?: string | null): PushCampaignScheduleSlot | null {
  const trimmed = slot?.trim();
  if (!trimmed) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (match) return `${match[1]}:${match[2]}`;
  throw new ApiException("PUSH_SCHEDULE_SLOT_INVALID", "推送时间格式必须是 HH:mm，例如 09:00、12:00、18:00 或 08:30");
}

function normalizeScheduleDate(date?: string | null): string {
  const trimmed = date?.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) throw new ApiException("PUSH_SCHEDULE_DATE_INVALID", "指定日期格式必须是 yyyy-mm-dd");
  return trimmed;
}

function buildNextDailyScheduledAt(slot: PushCampaignScheduleSlot, now = new Date()): Date {
  const beijingNow = new Date(now.getTime() + BEIJING_OFFSET_MS);
  const date = `${beijingNow.getUTCFullYear()}-${pad2(beijingNow.getUTCMonth() + 1)}-${pad2(beijingNow.getUTCDate())}`;
  let scheduledAt = buildBeijingDateTime(date, slot);
  if (scheduledAt <= now) {
    const tomorrow = new Date(Date.UTC(beijingNow.getUTCFullYear(), beijingNow.getUTCMonth(), beijingNow.getUTCDate() + 1));
    scheduledAt = buildBeijingDateTime(`${tomorrow.getUTCFullYear()}-${pad2(tomorrow.getUTCMonth() + 1)}-${pad2(tomorrow.getUTCDate())}`, slot);
  }
  return scheduledAt;
}

function buildBeijingDateTime(date: string, slot: PushCampaignScheduleSlot): Date {
  const [hour, minute] = slot.split(":").map(Number);
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0, 0));
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toDto(campaign: PushCampaignRow): PushCampaignDto {
  return {
    id: campaign.id,
    orgId: campaign.orgId,
    groupId: campaign.groupId,
    groupName: campaign.group.name,
    content: campaign.content,
    scheduleType: (campaign.scheduleType ?? "draft") as PushCampaignScheduleType,
    scheduleSlot: campaign.scheduleSlot as PushCampaignScheduleSlot | undefined,
    scheduleDate: campaign.scheduleDate ?? undefined,
    scheduledAt: campaign.scheduledAt?.toISOString(),
    status: campaign.status as PushCampaignStatus,
    lastSentAt: campaign.lastSentAt?.toISOString(),
    lastError: campaign.lastError ?? undefined,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString()
  };
}
