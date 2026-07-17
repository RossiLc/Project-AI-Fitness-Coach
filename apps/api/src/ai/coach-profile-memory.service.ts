import { Inject, Injectable, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

type ProfileMemoryKey = {
  orgId: string;
  memberId: string;
  wecomUserid: string;
};

type ProfileMemoryOptions = {
  now?: () => Date;
};

type CoachProfileJson = {
  goals: string[];
  preferences: string[];
  constraints: string[];
  notes: string[];
};

export const COACH_PROFILE_MEMORY_OPTIONS = Symbol("COACH_PROFILE_MEMORY_OPTIONS");

@Injectable()
export class CoachProfileMemoryService {
  private nowProvider: () => Date;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(COACH_PROFILE_MEMORY_OPTIONS) options: ProfileMemoryOptions = {}
  ) {
    this.nowProvider = options.now ?? (() => new Date());
  }

  async buildProfilePrompt(input: ProfileMemoryKey): Promise<string | null> {
    const profile = await this.prisma.coachProfileMemory.findFirst({
      where: { orgId: input.orgId, memberId: input.memberId, wecomUserid: input.wecomUserid }
    });
    if (!profile) return null;

    const data = this.normalizeProfile(profile.profileJson);
    const lines = [
      this.formatLine("目标", data.goals),
      this.formatLine("运动偏好", data.preferences),
      this.formatLine("注意事项", data.constraints),
      this.formatLine("其他稳定信息", data.notes)
    ].filter(Boolean);
    if (lines.length === 0) return null;
    return `用户长期结构化画像，只用于个性化健身建议，不代表医疗诊断：\n${lines.join("\n")}`;
  }

  async updateFromExchange(input: ProfileMemoryKey & { userText: string; assistantText: string }): Promise<void> {
    const extracted = this.extractProfile(input.userText);
    if (this.isEmptyProfile(extracted)) return;

    const existing = await this.prisma.coachProfileMemory.findFirst({
      where: { orgId: input.orgId, memberId: input.memberId, wecomUserid: input.wecomUserid }
    });
    const merged = this.mergeProfiles(this.normalizeProfile(existing?.profileJson), extracted);
    const now = this.nowProvider();
    const stableId = existing?.id ?? `profile_${this.hash(`${input.orgId}:${input.memberId}:${input.wecomUserid}`)}`;

    await this.prisma.coachProfileMemory.upsert({
      where: { id: stableId },
      create: {
        id: stableId,
        orgId: input.orgId,
        memberId: input.memberId,
        wecomUserid: input.wecomUserid,
        profileJson: merged as Prisma.InputJsonValue,
        updatedAt: now
      },
      update: {
        profileJson: merged as Prisma.InputJsonValue,
        updatedAt: now
      }
    });
  }

  private extractProfile(text: string): CoachProfileJson {
    const normalized = text.toLowerCase();
    return {
      goals: this.unique([/减脂|减肥|瘦身/.test(normalized) ? "减脂" : "", /增肌|力量增长/.test(normalized) ? "增肌" : ""]),
      preferences: this.unique([
        /爬坡/.test(normalized) ? "爬坡" : "",
        /跑步|慢跑/.test(normalized) ? "跑步" : "",
        /快走/.test(normalized) ? "快走" : "",
        /骑行|单车/.test(normalized) ? "骑行" : "",
        /力量|撸铁/.test(normalized) ? "力量训练" : ""
      ]),
      constraints: this.unique([
        /膝盖|膝关节/.test(normalized) ? "膝盖不适" : "",
        /腰|腰椎/.test(normalized) ? "腰部不适" : "",
        /肩/.test(normalized) ? "肩部不适" : ""
      ]),
      notes: []
    };
  }

  private normalizeProfile(value: unknown): CoachProfileJson {
    const record = value && typeof value === "object" ? (value as Partial<CoachProfileJson>) : {};
    return {
      goals: this.asStringArray(record.goals),
      preferences: this.asStringArray(record.preferences),
      constraints: this.asStringArray(record.constraints),
      notes: this.asStringArray(record.notes)
    };
  }

  private mergeProfiles(left: CoachProfileJson, right: CoachProfileJson): CoachProfileJson {
    return {
      goals: this.unique(left.goals.concat(right.goals)),
      preferences: this.unique(left.preferences.concat(right.preferences)),
      constraints: this.unique(left.constraints.concat(right.constraints)),
      notes: this.unique(left.notes.concat(right.notes))
    };
  }

  private isEmptyProfile(profile: CoachProfileJson): boolean {
    return profile.goals.length + profile.preferences.length + profile.constraints.length + profile.notes.length === 0;
  }

  private formatLine(label: string, values: string[]): string | null {
    return values.length > 0 ? `- ${label}：${values.join("、")}` : null;
  }

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? this.unique(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)) : [];
  }

  private unique(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex").slice(0, 24);
  }
}
