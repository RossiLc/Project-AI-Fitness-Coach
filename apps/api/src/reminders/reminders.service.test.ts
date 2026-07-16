import { describe, expect, it } from "vitest";
import { ReminderStatus } from "@openfit/shared";
import { RemindersService } from "./reminders.service.js";

describe("RemindersService", () => {
  it("生成示例提醒任务", async () => {
    let memberWhere: unknown;
    const prisma = {
      activity: {
        findFirst: async () => ({ id: "act_demo", orgId: "org_demo" })
      },
      member: {
        findFirst: async ({ where }: { where: unknown }) => {
          memberWhere = where;
          return { id: "wecom_member_001", displayName: "企业微信成员" };
        }
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
    expect(task.memberId).toBe("wecom_member_001");
    expect(memberWhere).toEqual({ orgId: "org_demo", status: "active" });
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

  it("sends a group reminder with missing members identified by WeCom userid", async () => {
    let sentText = "";
    const prisma = {
      activity: {
        findFirst: async () => ({ id: "act_demo", orgId: "org_demo" })
      },
      member: {
        findMany: async () => [
          { id: "employee_demo", displayName: "Employee A", wecomUserid: "wecom_employee_a" },
          { id: "unbound_demo", displayName: "Unbound C", wecomUserid: null },
          { id: "admin_demo", displayName: "Admin B", wecomUserid: "wecom_admin_b" }
        ]
      },
      checkin: {
        findMany: async () => [{ memberId: "admin_demo" }]
      }
    };
    const sender = {
      sendMarkdown: async (text: string) => {
        sentText = text;
        return { mode: "intelligent_bot" as const, ok: true, message: "sent" };
      }
    };
    const service = new RemindersService(prisma as never, undefined, sender as never);

    const result = await service.sendGroupMissingCheckinReminder(new Date("2026-07-14T20:00:00+08:00"));

    expect(result.missingCount).toBe(2);
    expect(result.mode).toBe("intelligent_bot");
    expect(sentText).toContain("2");
    expect(sentText).toContain("<@wecom_employee_a>");
    expect(sentText).toContain("Employee A");
    expect(sentText).toContain("Unbound C");
    expect(sentText).toContain("未绑定企业微信 userid");
    expect(sentText).not.toContain("Admin B");
  });

  it("sends missing-checkin reminder to the selected group chat using only selected group members", async () => {
    let sentChatId = "";
    let sentText = "";
    const prisma = {
      weComGroup: {
        findFirst: async ({ where }: { where: Record<string, unknown> }) => (where.id === "group_1" ? { id: "group_1", orgId: "org_demo", chatId: "chat_group_1" } : null)
      },
      activity: {
        findFirst: async () => ({ id: "act_demo", orgId: "org_demo", groupId: "group_1" })
      },
      weComGroupMember: {
        findMany: async () => [
          { memberId: "employee_a", displayName: "Employee A", wecomUserid: "wecom_a", member: { id: "employee_a", displayName: "Employee A", wecomUserid: "wecom_a" } },
          { memberId: "employee_b", displayName: "Employee B", wecomUserid: "wecom_b", member: { id: "employee_b", displayName: "Employee B", wecomUserid: "wecom_b" } }
        ]
      },
      checkin: {
        findMany: async () => [{ memberId: "employee_b" }]
      }
    };
    const sender = {
      sendMarkdownToChat: async (chatId: string, text: string) => {
        sentChatId = chatId;
        sentText = text;
        return { mode: "intelligent_bot" as const, ok: true, message: "sent" };
      }
    };
    const service = new RemindersService(prisma as never, undefined, sender as never);

    const result = await service.sendGroupMissingCheckinReminder("group_1", new Date("2026-07-14T20:00:00+08:00"));

    expect(result.missingCount).toBe(1);
    expect(sentChatId).toBe("chat_group_1");
    expect(sentText).toContain("<@wecom_a>");
    expect(sentText).not.toContain("Employee B");
  });
});
