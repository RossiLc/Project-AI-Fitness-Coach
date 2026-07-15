import { Inject, Injectable } from "@nestjs/common";
import type { LeaderboardCategory, LeaderboardDto, LeaderboardEntryDto } from "@openfit/shared";
import { PrismaService } from "../prisma/prisma.service.js";

const RANKING_RULES: Record<LeaderboardCategory, string> = {
  checkin_days: "按有效打卡天数/打卡次数排序；同分时按运动时长排序；只统计 submitted/corrected 记录。",
  duration_min: "按累计运动时长排序；同分时按打卡次数排序；只统计 submitted/corrected 记录。",
  calorie_estimate: "按累计消耗能量排序；同分时按打卡次数和运动时长排序；只统计 submitted/corrected 记录。"
};

type CheckinWithMember = {
  memberId: string;
  durationMin: number | null;
  calorieEstimate: number | null;
  submittedAt: Date | null;
  member: { displayName: string };
};

type AggregatedEntry = Omit<LeaderboardEntryDto, "rank"> & { days: Set<string> };

@Injectable()
export class LeaderboardsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async current(category: LeaderboardCategory = "checkin_days"): Promise<LeaderboardDto> {
    const activity = await this.prisma.activity.findFirst({ where: { status: "active" }, orderBy: { startAt: "desc" } });
    if (!activity) {
      return { status: "empty", category, rule: RANKING_RULES[category], generatedAt: new Date().toISOString(), entries: [] };
    }

    const checkins = await this.prisma.checkin.findMany({
      where: { activityId: activity.id, status: { in: ["submitted", "corrected"] } },
      include: { member: true }
    });

    return {
      status: checkins.length > 0 ? "computed" : "empty",
      category,
      rule: RANKING_RULES[category],
      generatedAt: new Date().toISOString(),
      entries: this.buildEntries(checkins, category)
    };
  }

  async rebuildSnapshot(category: LeaderboardCategory = "checkin_days") {
    const current = await this.current(category);
    const activity = await this.prisma.activity.findFirst({ where: { status: "active" }, orderBy: { startAt: "desc" } });
    if (!activity) return current;

    const snapshot = await this.prisma.leaderboardSnapshot.create({
      data: {
        activityId: activity.id,
        periodStart: activity.startAt,
        periodEnd: new Date(),
        ruleVersion: `${category}_v1`,
        entries: {
          create: current.entries.map((entry) => ({
            memberId: entry.memberId,
            rank: entry.rank,
            score: scoreFor(entry, category),
            checkinDays: entry.checkinDays,
            durationMin: entry.durationMin,
            calorieEstimate: entry.calorieEstimate
          }))
        }
      },
      include: { entries: true }
    });

    return { ...current, snapshotId: snapshot.id, generatedAt: snapshot.generatedAt.toISOString() };
  }

  private buildEntries(checkins: CheckinWithMember[], category: LeaderboardCategory): LeaderboardEntryDto[] {
    const grouped = new Map<string, AggregatedEntry>();

    for (const checkin of checkins) {
      const existing =
        grouped.get(checkin.memberId) ??
        {
          memberId: checkin.memberId,
          memberName: checkin.member.displayName,
          checkinDays: 0,
          durationMin: 0,
          calorieEstimate: 0,
          days: new Set<string>()
        };
      if (checkin.submittedAt) existing.days.add(checkin.submittedAt.toISOString().slice(0, 10));
      existing.durationMin += checkin.durationMin ?? 0;
      existing.calorieEstimate += checkin.calorieEstimate ?? 0;
      existing.checkinDays = existing.days.size;
      grouped.set(checkin.memberId, existing);
    }

    return [...grouped.values()]
      .sort((a, b) => compareEntry(a, b, category))
      .map((entry, index) => ({
        rank: index + 1,
        memberId: entry.memberId,
        memberName: entry.memberName,
        checkinDays: entry.checkinDays,
        durationMin: entry.durationMin,
        calorieEstimate: entry.calorieEstimate
      }));
  }
}

function compareEntry(a: AggregatedEntry, b: AggregatedEntry, category: LeaderboardCategory) {
  if (category === "duration_min") return b.durationMin - a.durationMin || b.checkinDays - a.checkinDays || a.memberName.localeCompare(b.memberName);
  if (category === "calorie_estimate") return b.calorieEstimate - a.calorieEstimate || b.checkinDays - a.checkinDays || b.durationMin - a.durationMin || a.memberName.localeCompare(b.memberName);
  return b.checkinDays - a.checkinDays || b.durationMin - a.durationMin || a.memberName.localeCompare(b.memberName);
}

function scoreFor(entry: LeaderboardEntryDto, category: LeaderboardCategory) {
  if (category === "duration_min") return entry.durationMin;
  if (category === "calorie_estimate") return entry.calorieEstimate;
  return entry.checkinDays;
}
