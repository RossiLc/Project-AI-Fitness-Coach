import { Inject, Injectable } from "@nestjs/common";
import type { LeaderboardDto, LeaderboardEntryDto } from "@openfit/shared";
import { PrismaService } from "../prisma/prisma.service.js";

const RANKING_RULE = "按有效打卡天数优先、累计运动时长次之排序；只统计 submitted/corrected 记录。";

@Injectable()
export class LeaderboardsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async current(): Promise<LeaderboardDto> {
    const activity = await this.prisma.activity.findFirst({ where: { status: "active" }, orderBy: { startAt: "desc" } });
    if (!activity) {
      return { status: "empty", rule: RANKING_RULE, generatedAt: new Date().toISOString(), entries: [] };
    }

    const checkins = await this.prisma.checkin.findMany({
      where: { activityId: activity.id, status: { in: ["submitted", "corrected"] } },
      include: { member: true }
    });

    return {
      status: checkins.length > 0 ? "computed" : "empty",
      rule: RANKING_RULE,
      generatedAt: new Date().toISOString(),
      entries: this.buildEntries(checkins)
    };
  }

  async rebuildSnapshot() {
    const current = await this.current();
    const activity = await this.prisma.activity.findFirst({ where: { status: "active" }, orderBy: { startAt: "desc" } });
    if (!activity) return current;

    const snapshot = await this.prisma.leaderboardSnapshot.create({
      data: {
        activityId: activity.id,
        periodStart: activity.startAt,
        periodEnd: new Date(),
        entries: {
          create: current.entries.map((entry) => ({
            memberId: entry.memberId,
            rank: entry.rank,
            score: entry.checkinDays * 10000 + entry.durationMin,
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

  private buildEntries(
    checkins: Array<{
      memberId: string;
      durationMin: number | null;
      calorieEstimate: number | null;
      submittedAt: Date | null;
      member: { displayName: string };
    }>
  ): LeaderboardEntryDto[] {
    const grouped = new Map<string, Omit<LeaderboardEntryDto, "rank"> & { days: Set<string> }>();

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
      .sort((a, b) => b.checkinDays - a.checkinDays || b.durationMin - a.durationMin || a.memberName.localeCompare(b.memberName))
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
