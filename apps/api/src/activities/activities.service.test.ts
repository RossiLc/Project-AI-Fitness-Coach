import { describe, expect, it } from "vitest";
import { ActivitiesService } from "./activities.service.js";

describe("ActivitiesService", () => {
  it("读取当前活动配置并解析活动内容", async () => {
    const prisma = {
      activity: {
        findFirst: async () => ({
          id: "act_demo",
          name: "夏季打卡",
          status: "active",
          startAt: new Date("2026-07-01T00:00:00+08:00"),
          endAt: new Date("2026-07-31T23:59:59+08:00"),
          reminderTime: "20:00",
          ruleJson: { content: "每天提交运动文字和图片，连续打卡进入排行榜。" }
        })
      }
    };
    const service = new ActivitiesService(prisma as never);

    const config = await service.getCurrentConfig();

    expect(config?.content).toBe("每天提交运动文字和图片，连续打卡进入排行榜。");
  });

  it("更新活动配置时只写入活动名称和活动内容", async () => {
    const prisma = {
      activity: {
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "act_demo",
          name: data.name,
          status: "active",
          startAt: data.startAt,
          endAt: data.endAt,
          reminderTime: "20:00",
          ruleJson: data.ruleJson
        })
      }
    };
    const service = new ActivitiesService(prisma as never);

    const updated = await service.updateConfig("act_demo", {
      name: "八月运动打卡",
      content: "活动内容：每天完成一次带图运动打卡。",
      startAt: "2026-08-01",
      endAt: "2026-08-31"
    });

    expect(updated.name).toBe("八月运动打卡");
    expect(updated.content).toBe("活动内容：每天完成一次带图运动打卡。");
    expect(updated.startAt).toBe("2026-08-01T00:00:00.000Z");
    expect(updated.endAt).toBe("2026-08-31T23:59:59.999Z");
  });

  it("lists activities for admin table without requiring activity rule table", async () => {
    const prisma = {
      activity: {
        findMany: async () => [
          {
            id: "act_demo",
            name: "July Challenge",
            status: "active",
            startAt: new Date("2026-07-01T00:00:00+08:00"),
            endAt: new Date("2026-07-31T23:59:59+08:00"),
            reminderTime: "20:00",
            ruleJson: { content: "活动内容" }
          }
        ]
      }
    };
    const service = new ActivitiesService(prisma as never);

    const result = await service.listConfigs("org_demo");

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "act_demo", name: "July Challenge", content: "活动内容" });
  });

  it("creates active activity config with name and content and pauses previous active activity in the same scope", async () => {
    const createdRecords: Array<Record<string, unknown>> = [];
    const updateManyCalls: Array<Record<string, unknown>> = [];
    const prisma = {
      activity: {
        updateMany: async (args: Record<string, unknown>) => {
          updateManyCalls.push(args);
          return { count: 1 };
        },
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdRecords.push(data);
          return {
            id: "act_new",
            name: data.name,
            status: data.status,
            startAt: data.startAt,
            endAt: data.endAt,
            reminderTime: data.reminderTime,
            ruleJson: data.ruleJson
          };
        }
      }
    };
    const service = new ActivitiesService(prisma as never);

    const created = await service.createConfig("org_demo", {
      name: "九月运动打卡",
      content: "每天提交运动内容和图片。",
      startAt: "2026-09-01",
      endAt: "2026-09-30"
    });

    expect(created).toMatchObject({
      id: "act_new",
      name: "九月运动打卡",
      content: "每天提交运动内容和图片。",
      status: "active"
    });
    expect(updateManyCalls[0]).toMatchObject({
      where: { orgId: "org_demo", groupId: null, status: "active" },
      data: { status: "paused" }
    });
    expect(createdRecords[0]).toMatchObject({
      orgId: "org_demo",
      name: "九月运动打卡",
      status: "active",
      startAt: new Date("2026-09-01T00:00:00.000Z"),
      endAt: new Date("2026-09-30T23:59:59.999Z"),
      reminderTime: "20:00",
      ruleJson: { content: "每天提交运动内容和图片。" }
    });
  });

  it("rejects activity config when end date is before start date", async () => {
    const prisma = {
      activity: {
        updateMany: async () => {
          throw new Error("should not pause");
        },
        create: async () => {
          throw new Error("should not create");
        }
      }
    };
    const service = new ActivitiesService(prisma as never);

    await expect(
      service.createConfig("org_demo", {
        name: "错误活动",
        content: "活动内容",
        startAt: "2026-07-31",
        endAt: "2026-06-30"
      })
    ).rejects.toMatchObject({
      response: { error: { message: "活动结束日期不能早于开始日期" } }
    });
  });
});
