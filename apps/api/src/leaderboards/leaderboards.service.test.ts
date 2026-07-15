import { describe, expect, it } from "vitest";
import { LeaderboardsService } from "./leaderboards.service.js";

describe("LeaderboardsService", () => {
  it("按有效打卡天数优先、累计运动时长次之计算当前排行榜", async () => {
    const prisma = {
      activity: {
        findFirst: async () => ({ id: "act_demo", name: "夏季打卡" })
      },
      checkin: {
        findMany: async () => [
          {
            memberId: "m1",
            durationMin: 30,
            calorieEstimate: 120,
            submittedAt: new Date("2026-07-11T10:00:00+08:00"),
            member: { displayName: "员工甲" }
          },
          {
            memberId: "m1",
            durationMin: 40,
            calorieEstimate: 150,
            submittedAt: new Date("2026-07-12T10:00:00+08:00"),
            member: { displayName: "员工甲" }
          },
          {
            memberId: "m2",
            durationMin: 100,
            calorieEstimate: 300,
            submittedAt: new Date("2026-07-12T10:00:00+08:00"),
            member: { displayName: "员工乙" }
          }
        ]
      }
    };
    const service = new LeaderboardsService(prisma as never);

    const result = await service.current();

    expect(result.rule).toContain("有效打卡天数");
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({ rank: 1, memberId: "m1", memberName: "员工甲", checkinDays: 2, durationMin: 70 });
    expect(result.entries[1]).toMatchObject({ rank: 2, memberId: "m2", memberName: "员工乙", checkinDays: 1, durationMin: 100 });
  });

  it("supports ranking by duration and calories", async () => {
    const prisma = {
      activity: {
        findFirst: async () => ({ id: "act_demo", name: "July Challenge" })
      },
      checkin: {
        findMany: async () => [
          {
            memberId: "m1",
            durationMin: 30,
            calorieEstimate: 120,
            submittedAt: new Date("2026-07-11T10:00:00+08:00"),
            member: { displayName: "A" }
          },
          {
            memberId: "m2",
            durationMin: 80,
            calorieEstimate: 300,
            submittedAt: new Date("2026-07-11T10:00:00+08:00"),
            member: { displayName: "B" }
          }
        ]
      }
    };
    const service = new LeaderboardsService(prisma as never);

    const byDuration = await service.current("duration_min");
    const byCalories = await service.current("calorie_estimate");

    expect(byDuration.category).toBe("duration_min");
    expect(byDuration.entries[0]).toMatchObject({ memberId: "m2", durationMin: 80 });
    expect(byCalories.category).toBe("calorie_estimate");
    expect(byCalories.entries[0]).toMatchObject({ memberId: "m2", calorieEstimate: 300 });
  });
});
