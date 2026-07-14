import { Inject, Injectable } from "@nestjs/common";
import type { ActivityConfigDto, UpdateActivityConfigRequest } from "@openfit/shared";
import { Prisma } from "@prisma/client";
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

  async updateConfig(id: string, body: UpdateActivityConfigRequest): Promise<ActivityConfigDto> {
    const activity = await this.prisma.activity.update({
      where: { id },
      data: {
        name: body.name,
        reminderTime: body.reminderTime,
        ruleJson: {
          ranking: [body.rankingPrimary, body.rankingSecondary],
          makeupWindowDays: body.makeupWindowDays
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
    status: activity.status,
    startAt: activity.startAt.toISOString(),
    endAt: activity.endAt.toISOString(),
    reminderTime: activity.reminderTime,
    rankingPrimary: "checkin_days",
    rankingSecondary: "duration_min",
    makeupWindowDays: rule.makeupWindowDays
  };
}

function normalizeRule(ruleJson: Prisma.JsonValue): { makeupWindowDays: number } {
  if (!ruleJson || typeof ruleJson !== "object" || Array.isArray(ruleJson)) return { makeupWindowDays: 0 };
  const value = (ruleJson as Record<string, unknown>).makeupWindowDays;
  return { makeupWindowDays: typeof value === "number" ? value : 0 };
}
