import { describe, expect, it } from "vitest";
import { ReminderStatus } from "@openfit/shared";
import { RemindersService } from "./reminders.service.js";

describe("RemindersService", () => {
  it("生成示例提醒任务", async () => {
    const prisma = {
      activity: {
        findFirst: async () => ({ id: "act_demo" })
      },
      member: {
        findFirst: async () => ({ id: "employee_demo", displayName: "员工小李" })
      },
      reminderTask: {
        upsert: async ({ create }: { create: Record<string, unknown> }) => ({
          id: "reminder_demo_generated",
          ...create
        })
      }
    };
    const service = new RemindersService(prisma as never);

    const task = await service.createDemoManualTask();

    expect(task.id).toBe("reminder_demo_generated");
    expect(task.status).toBe(ReminderStatus.Manual);
    expect(task.memberId).toBe("employee_demo");
  });

  it("为当天未提交有效打卡的成员生成 manual 提醒任务", async () => {
    const upserts: Array<Record<string, unknown>> = [];
    const prisma = {
      activity: {
        findFirst: async () => ({ id: "act_demo", orgId: "org_demo" })
      },
      member: {
        findMany: async () => [
          { id: "employee_demo", displayName: "员工小李" },
          { id: "admin_demo", displayName: "活动管理员王姐" }
        ]
      },
      checkin: {
        findMany: async () => [{ memberId: "admin_demo" }]
      },
      reminderTask: {
        upsert: async ({ create }: { create: Record<string, unknown> }) => {
          upserts.push(create);
          return create;
        }
      }
    };
    const service = new RemindersService(prisma as never);

    const result = await service.scanMissingForDate(new Date("2026-07-13T20:00:00+08:00"));

    expect(result.created).toBe(1);
    expect(upserts[0]).toMatchObject({ memberId: "employee_demo", status: ReminderStatus.Manual, channel: "web_manual" });
  });

  it("重试失败提醒时增加尝试次数并清空失败原因", async () => {
    const prisma = {
      reminderTask: {
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "reminder_failed",
          status: data.status,
          attemptCount: 3,
          lastError: data.lastError
        })
      }
    };
    const service = new RemindersService(prisma as never);

    const result = await service.retry("reminder_failed");

    expect(result.status).toBe(ReminderStatus.Eligible);
    expect(result.lastError).toBeNull();
  });

  it("向已绑定 userid 的成员发送个人提醒并标记 sent", async () => {
    const prisma = {
      reminderTask: {
        findFirst: async () => ({
          id: "rem_1",
          member: { wecomUserid: "wecom_user_001", displayName: "员工小李" }
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "rem_1", ...data })
      }
    };
    const app = {
      sendAppMessage: async () => ({ ok: true, mode: "mock", message: "mock 已发送" })
    };
    const service = new RemindersService(prisma as never, app as never);

    const result = await service.sendPersonalReminder("rem_1");

    expect(result.status).toBe(ReminderStatus.Sent);
    expect(result.lastError).toBeNull();
  });

  it("sends a group reminder for missing checkins without exposing member names", async () => {
    let sentText = "";
    const prisma = {
      activity: {
        findFirst: async () => ({ id: "act_demo", orgId: "org_demo" })
      },
      member: {
        findMany: async () => [
          { id: "employee_demo", displayName: "Employee A" },
          { id: "admin_demo", displayName: "Admin B" }
        ]
      },
      checkin: {
        findMany: async () => [{ memberId: "admin_demo" }]
      }
    };
    const sender = {
      sendMarkdown: async (text: string) => {
        sentText = text;
        return { mode: "mock" as const, ok: true, message: "mock sent" };
      }
    };
    const service = new RemindersService(prisma as never, undefined, sender as never);

    const result = await service.sendGroupMissingCheckinReminder(new Date("2026-07-14T20:00:00+08:00"));

    expect(result.missingCount).toBe(1);
    expect(result.mode).toBe("mock");
    expect(sentText).toContain("1");
    expect(sentText).not.toContain("Employee A");
  });
});
