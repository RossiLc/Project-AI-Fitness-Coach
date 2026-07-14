import { describe, expect, it } from "vitest";
import { ActivitiesService } from "./activities.service.js";

describe("ActivitiesService", () => {
  it("读取当前活动配置并解析排行榜规则", async () => {
    const prisma = {
      activity: {
        findFirst: async () => ({
          id: "act_demo",
          name: "夏季打卡",
          status: "active",
          startAt: new Date("2026-07-01T00:00:00+08:00"),
          endAt: new Date("2026-07-31T23:59:59+08:00"),
          reminderTime: "20:00",
          ruleJson: { ranking: ["checkin_days", "duration_min"], makeupWindowDays: 1 }
        })
      }
    };
    const service = new ActivitiesService(prisma as never);

    const config = await service.getCurrentConfig();

    expect(config?.rankingPrimary).toBe("checkin_days");
    expect(config?.rankingSecondary).toBe("duration_min");
    expect(config?.makeupWindowDays).toBe(1);
  });

  it("更新活动规则时写入 ruleJson 并保留活动状态", async () => {
    const prisma = {
      activity: {
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "act_demo",
          name: data.name,
          status: "active",
          startAt: new Date("2026-07-01T00:00:00+08:00"),
          endAt: new Date("2026-07-31T23:59:59+08:00"),
          reminderTime: data.reminderTime,
          ruleJson: data.ruleJson
        })
      }
    };
    const service = new ActivitiesService(prisma as never);

    const updated = await service.updateConfig("act_demo", {
      name: "八月运动打卡",
      reminderTime: "19:30",
      rankingPrimary: "checkin_days",
      rankingSecondary: "duration_min",
      makeupWindowDays: 2
    });

    expect(updated.name).toBe("八月运动打卡");
    expect(updated.reminderTime).toBe("19:30");
    expect(updated.makeupWindowDays).toBe(2);
  });
});
