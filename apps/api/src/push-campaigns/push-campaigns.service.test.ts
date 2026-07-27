import { describe, expect, it } from "vitest";
import { ApiException } from "../common/api-response.js";
import { PushCampaignsService } from "./push-campaigns.service.js";

const baseCampaign = {
  id: "push_1",
  orgId: "org_demo",
  groupId: "group_1",
  content: "今晚 8 点记得打卡",
  scheduleType: "daily",
  scheduleSlot: "18:00",
  scheduleDate: null,
  scheduledAt: new Date("2026-07-27T12:00:00.000Z"),
  status: "scheduled",
  lastSentAt: null,
  lastError: null,
  createdAt: new Date("2026-07-27T08:00:00.000Z"),
  updatedAt: new Date("2026-07-27T08:00:00.000Z"),
  group: { id: "group_1", name: "Open Fit 测试群", chatId: "chat_1" }
};

describe("PushCampaignsService", () => {
  it("lists push campaigns for the selected group", async () => {
    let whereArg: unknown;
    const prisma = {
      pushCampaign: {
        findMany: async ({ where }: { where: unknown }) => {
          whereArg = where;
          return [baseCampaign];
        }
      }
    };
    const service = new PushCampaignsService(prisma as never);

    const result = await service.list("org_demo", "group_1");

    expect(whereArg).toEqual({ orgId: "org_demo", groupId: "group_1" });
    expect(result[0]).toMatchObject({
      id: "push_1",
      groupName: "Open Fit 测试群",
      status: "scheduled"
    });
  });

  it("creates a daily scheduled push campaign using Beijing time", async () => {
    let createData: Record<string, unknown> | undefined;
    const prisma = {
      weComGroup: {
        findFirst: async () => ({ id: "group_1", orgId: "org_demo" })
      },
      pushCampaign: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createData = data;
          return { ...baseCampaign, ...data, group: baseCampaign.group };
        }
      }
    };
    const service = new PushCampaignsService(prisma as never);

    const result = await service.create("org_demo", {
      groupId: "group_1",
      content: "明早 9 点发起运动挑战",
      scheduleType: "daily",
      scheduleSlot: "09:00"
    }, new Date("2026-07-27T00:30:00.000Z"));

    expect(createData).toMatchObject({
      orgId: "org_demo",
      groupId: "group_1",
      content: "明早 9 点发起运动挑战",
      scheduleType: "daily",
      scheduleSlot: "09:00",
      status: "scheduled"
    });
    expect((createData?.scheduledAt as Date).toISOString()).toBe("2026-07-27T01:00:00.000Z");
    expect(result.status).toBe("scheduled");
  });

  it("schedules tomorrow in Beijing time when today's daily slot has passed", async () => {
    let createData: Record<string, unknown> | undefined;
    const prisma = {
      weComGroup: {
        findFirst: async () => ({ id: "group_1", orgId: "org_demo" })
      },
      pushCampaign: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createData = data;
          return { ...baseCampaign, ...data, group: baseCampaign.group };
        }
      }
    };
    const service = new PushCampaignsService(prisma as never);

    await service.create("org_demo", {
      groupId: "group_1",
      content: "明早 9 点提醒",
      scheduleType: "daily",
      scheduleSlot: "09:00"
    }, new Date("2026-07-27T02:00:00.000Z"));

    expect((createData?.scheduledAt as Date).toISOString()).toBe("2026-07-28T01:00:00.000Z");
  });

  it("creates a one-time scheduled push for a selected Beijing date and slot", async () => {
    let createData: Record<string, unknown> | undefined;
    const prisma = {
      weComGroup: {
        findFirst: async () => ({ id: "group_1", orgId: "org_demo" })
      },
      pushCampaign: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createData = data;
          return { ...baseCampaign, ...data, group: baseCampaign.group };
        }
      }
    };
    const service = new PushCampaignsService(prisma as never);

    await service.create("org_demo", {
      groupId: "group_1",
      content: "指定日期下午 6 点提醒",
      scheduleType: "once",
      scheduleDate: "2026-07-30",
      scheduleSlot: "18:00"
    }, new Date("2026-07-27T02:00:00.000Z"));

    expect(createData).toMatchObject({
      scheduleType: "once",
      scheduleDate: "2026-07-30",
      scheduleSlot: "18:00",
      status: "scheduled"
    });
    expect((createData?.scheduledAt as Date).toISOString()).toBe("2026-07-30T10:00:00.000Z");
  });

  it("creates a daily scheduled push campaign with a custom Beijing time slot", async () => {
    let createData: Record<string, unknown> | undefined;
    const prisma = {
      weComGroup: {
        findFirst: async () => ({ id: "group_1", orgId: "org_demo" })
      },
      pushCampaign: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createData = data;
          return { ...baseCampaign, ...data, group: baseCampaign.group };
        }
      }
    };
    const service = new PushCampaignsService(prisma as never);

    await service.create("org_demo", {
      groupId: "group_1",
      content: "自定义早间提醒",
      scheduleType: "daily",
      scheduleSlot: "08:30"
    }, new Date("2026-07-27T00:00:00.000Z"));

    expect(createData).toMatchObject({
      scheduleType: "daily",
      scheduleSlot: "08:30",
      status: "scheduled"
    });
    expect((createData?.scheduledAt as Date).toISOString()).toBe("2026-07-27T00:30:00.000Z");
  });

  it("rejects invalid custom schedule slot format", async () => {
    const prisma = {
      weComGroup: {
        findFirst: async () => ({ id: "group_1", orgId: "org_demo" })
      }
    };
    const service = new PushCampaignsService(prisma as never);

    await expect(service.create("org_demo", {
      groupId: "group_1",
      content: "非法时间",
      scheduleType: "daily",
      scheduleSlot: "24:00"
    })).rejects.toMatchObject({
      code: "PUSH_SCHEDULE_SLOT_INVALID"
    });
  });

  it("updates editable fields and recalculates status", async () => {
    let updateData: Record<string, unknown> | undefined;
    const prisma = {
      pushCampaign: {
        findFirst: async () => baseCampaign,
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updateData = data;
          return { ...baseCampaign, ...data, group: baseCampaign.group };
        }
      },
      weComGroup: {
        findFirst: async () => ({ id: "group_2", orgId: "org_demo" })
      }
    };
    const service = new PushCampaignsService(prisma as never);

    const result = await service.update("org_demo", "push_1", {
      groupId: "group_2",
      content: "今天加餐提醒：先喝水再决定",
      scheduleType: "draft",
      scheduleSlot: null
    });

    expect(updateData).toMatchObject({
      groupId: "group_2",
      content: "今天加餐提醒：先喝水再决定",
      scheduleType: "draft",
      scheduledAt: null,
      status: "draft"
    });
    expect(result.status).toBe("draft");
  });

  it("sends a daily campaign immediately without cancelling future schedule", async () => {
    let sentChatId = "";
    let sentText = "";
    let updatedData: Record<string, unknown> | undefined;
    const prisma = {
      pushCampaign: {
        findFirst: async () => baseCampaign,
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updatedData = data;
          return { ...baseCampaign, ...data, group: baseCampaign.group };
        }
      }
    };
    const sender = {
      sendMarkdownToChat: async (chatId: string, text: string) => {
        sentChatId = chatId;
        sentText = text;
        return { mode: "intelligent_bot" as const, ok: true, message: "sent" };
      }
    };
    const service = new PushCampaignsService(prisma as never, sender as never);

    const result = await service.sendNow("org_demo", "push_1");

    expect(sentChatId).toBe("chat_1");
    expect(sentText).toBe("今晚 8 点记得打卡");
    expect(updatedData).toMatchObject({ status: "scheduled", lastError: null });
    expect(result.status).toBe("scheduled");
  });

  it("marks campaign failed and rejects manual send when target group is not bound", async () => {
    let updatedData: Record<string, unknown> | undefined;
    const prisma = {
      pushCampaign: {
        findFirst: async () => ({ ...baseCampaign, group: { ...baseCampaign.group, chatId: null } }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updatedData = data;
          return { ...baseCampaign, ...data, group: { ...baseCampaign.group, chatId: null } };
        }
      }
    };
    const service = new PushCampaignsService(prisma as never);

    await expect(service.sendNow("org_demo", "push_1")).rejects.toMatchObject({
      code: "PUSH_CAMPAIGN_SEND_FAILED"
    });

    expect(updatedData).toMatchObject({ status: "failed" });
  });

  it("marks campaign failed and rejects manual send when WeCom send ack returns an error", async () => {
    let updatedData: Record<string, unknown> | undefined;
    const prisma = {
      pushCampaign: {
        findFirst: async () => baseCampaign,
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updatedData = data;
          return { ...baseCampaign, ...data, group: baseCampaign.group };
        }
      }
    };
    const sender = {
      sendMarkdownToChat: async () => {
        throw new Error("errcode=93001, errmsg=not allow send msg in room");
      }
    };
    const service = new PushCampaignsService(prisma as never, sender as never);

    await expect(service.sendNow("org_demo", "push_1")).rejects.toMatchObject({
      code: "PUSH_CAMPAIGN_SEND_FAILED"
    });

    expect(updatedData).toMatchObject({ status: "failed" });
    expect(updatedData?.lastError).toContain("93001");
  });

  it("dispatches due daily campaigns and schedules next day in Beijing time", async () => {
    const sent: string[] = [];
    const updated: Array<Record<string, unknown>> = [];
    const dueCampaign = { ...baseCampaign, id: "push_due", scheduleType: "daily", scheduleSlot: "09:00", scheduledAt: new Date("2026-07-27T00:59:00.000Z") };
    const prisma = {
      pushCampaign: {
        findMany: async () => [dueCampaign],
        findFirst: async ({ where }: { where: { id: string } }) => (where.id === "push_due" ? dueCampaign : null),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updated.push(data);
          return { ...dueCampaign, ...data, group: dueCampaign.group };
        }
      }
    };
    const sender = {
      sendMarkdownToChat: async (chatId: string) => {
        sent.push(chatId);
        return { mode: "intelligent_bot" as const, ok: true, message: "sent" };
      }
    };
    const service = new PushCampaignsService(prisma as never, sender as never);

    const result = await service.dispatchDue(new Date("2026-07-27T01:00:00.000Z"));

    expect(result.scanned).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(sent).toEqual(["chat_1"]);
    expect(updated[0]).toMatchObject({ status: "scheduled" });
    expect((updated[0].lastSentAt as Date).toISOString()).toBe("2026-07-27T01:00:00.000Z");
    expect((updated[0].scheduledAt as Date).toISOString()).toBe("2026-07-28T01:00:00.000Z");
  });

  it("dispatches one-time campaigns and marks them sent", async () => {
    const updated: Array<Record<string, unknown>> = [];
    const dueCampaign = { ...baseCampaign, id: "push_once", scheduleType: "once", scheduleSlot: "12:00", scheduleDate: "2026-07-27", scheduledAt: new Date("2026-07-27T04:00:00.000Z") };
    const prisma = {
      pushCampaign: {
        findMany: async () => [dueCampaign],
        findFirst: async ({ where }: { where: { id: string } }) => (where.id === "push_once" ? dueCampaign : null),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updated.push(data);
          return { ...dueCampaign, ...data, group: dueCampaign.group };
        }
      }
    };
    const sender = {
      sendMarkdownToChat: async () => ({ mode: "intelligent_bot" as const, ok: true, message: "sent" })
    };
    const service = new PushCampaignsService(prisma as never, sender as never);

    const result = await service.dispatchDue(new Date("2026-07-27T04:00:00.000Z"));

    expect(result.sent).toBe(1);
    expect(updated[0]).toMatchObject({ status: "sent", scheduledAt: null });
  });

  it("rejects blank content", async () => {
    const service = new PushCampaignsService({} as never);

    await expect(service.create("org_demo", { groupId: "group_1", content: "   " })).rejects.toBeInstanceOf(ApiException);
  });

  it("deletes an owned push campaign", async () => {
    let deletedId = "";
    const prisma = {
      pushCampaign: {
        findFirst: async () => baseCampaign,
        delete: async ({ where }: { where: { id: string } }) => {
          deletedId = where.id;
          return baseCampaign;
        }
      }
    };
    const service = new PushCampaignsService(prisma as never);

    const result = await service.delete("org_demo", "push_1");

    expect(deletedId).toBe("push_1");
    expect(result).toEqual({ id: "push_1", deleted: true });
  });
});
