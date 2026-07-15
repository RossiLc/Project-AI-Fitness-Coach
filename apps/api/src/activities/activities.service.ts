import { Inject, Injectable } from "@nestjs/common";
import { ActivityStatus, type ActivityConfigDto, type CreateActivityConfigRequest, type UpdateActivityConfigRequest } from "@openfit/shared";
import { Prisma } from "@prisma/client";
import { ApiException } from "../common/api-response.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class ActivitiesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getCurrentActivity() {
    return this.prisma.activity.findFirst({
      where: { status: "active" },
      orderBy: { startAt: "desc" }
    });
  }

  async getCurrentConfig(): Promise<ActivityConfigDto | null> {
    const activity = await this.getCurrentActivity();
    return activity ? toConfigDto(activity) : null;
  }

  async listConfigs(orgId: string): Promise<ActivityConfigDto[]> {
    const activities = await this.prisma.activity.findMany({
      where: { orgId },
      orderBy: [{ status: "asc" }, { startAt: "desc" }]
    });
    return activities.map((activity) => toConfigDto(activity));
  }

  async createConfig(orgId: string, body: CreateActivityConfigRequest): Promise<ActivityConfigDto> {
    const name = body.name.trim();
    const content = body.content.trim();
    const { startAt, endAt } = parseActivityPeriod(body.startAt, body.endAt);
    if (!name || !content) {
      throw new ApiException("ACTIVITY_CONFIG_INVALID", "活动名称和活动内容不能为空");
    }

    const activity = await this.prisma.activity.create({
      data: {
        orgId,
        name,
        startAt,
        endAt,
        status: ActivityStatus.Draft,
        reminderTime: "20:00",
        ruleJson: {
          content
        } as Prisma.InputJsonValue
      }
    });

    return toConfigDto(activity);
  }

  async updateConfig(id: string, body: UpdateActivityConfigRequest): Promise<ActivityConfigDto> {
    const name = body.name.trim();
    const content = body.content.trim();
    const { startAt, endAt } = parseActivityPeriod(body.startAt, body.endAt);
    if (!name || !content) {
      throw new ApiException("ACTIVITY_CONFIG_INVALID", "活动名称和活动内容不能为空");
    }

    const activity = await this.prisma.activity.update({
      where: { id },
      data: {
        name,
        startAt,
        endAt,
        ruleJson: {
          content
        } as Prisma.InputJsonValue
      }
    });

    return toConfigDto(activity);
  }
}

function toConfigDto(activity: {
  id: string;
  name: string;
  status: string;
  startAt: Date;
  endAt: Date;
  reminderTime: string;
  ruleJson: Prisma.JsonValue;
}): ActivityConfigDto {
  const rule = normalizeRule(activity.ruleJson);
  return {
    id: activity.id,
    name: activity.name,
    content: rule.content,
    status: activity.status,
    startAt: activity.startAt.toISOString(),
    endAt: activity.endAt.toISOString(),
    reminderTime: activity.reminderTime,
    rankingPrimary: "checkin_days",
    rankingSecondary: "duration_min",
    makeupWindowDays: rule.makeupWindowDays
  };
}

function normalizeRule(ruleJson: Prisma.JsonValue): { content: string; makeupWindowDays: number } {
  if (!ruleJson || typeof ruleJson !== "object" || Array.isArray(ruleJson)) return { content: "", makeupWindowDays: 0 };
  const value = (ruleJson as Record<string, unknown>).makeupWindowDays;
  const content = (ruleJson as Record<string, unknown>).content;
  return {
    content: typeof content === "string" ? content : "",
    makeupWindowDays: typeof value === "number" ? value : 0
  };
}

function parseActivityPeriod(startDate: string, endDate: string): { startAt: Date; endAt: Date } {
  if (!isDateOnly(startDate) || !isDateOnly(endDate)) {
    throw new ApiException("ACTIVITY_CONFIG_INVALID", "活动开始日期和结束日期必须填写，并使用 YYYY-MM-DD 格式");
  }

  const startAt = new Date(`${startDate}T00:00:00.000Z`);
  const endAt = new Date(`${endDate}T23:59:59.999Z`);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new ApiException("ACTIVITY_CONFIG_INVALID", "活动日期格式无效");
  }
  if (endAt < startAt) {
    throw new ApiException("ACTIVITY_CONFIG_INVALID", "活动结束日期不能早于开始日期");
  }

  return { startAt, endAt };
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
