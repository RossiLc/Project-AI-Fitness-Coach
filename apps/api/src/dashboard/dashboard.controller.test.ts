import { describe, expect, it } from "vitest";
import { DashboardController } from "./dashboard.controller.js";

describe("DashboardController", () => {
  it("counts only today's valid checkins and includes total active members", async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const prisma = {
      activity: {
        findFirst: async () => ({ id: "act_demo", orgId: "org_demo", status: "active" })
      },
      member: {
        count: async () => 3
      },
      checkin: {
        findMany: async ({ where }: { where: { submittedAt?: { gte: Date; lt: Date } } }) => {
          expect(where.submittedAt).toBeDefined();
          return [
            { memberId: "member_a", durationMin: 30, submittedAt: today },
            { memberId: "member_b", durationMin: 40, submittedAt: today }
          ];
        }
      },
      reminderTask: {
        count: async () => 1
      }
    };
    const controller = new DashboardController(prisma as never);

    const summary = await controller.getSummary();

    expect(summary.todayCheckinCount).toBe(2);
    expect(summary.totalMemberCount).toBe(3);
    expect(summary.missingCount).toBe(1);
    expect(summary.checkinRate).toBe(67);
  });
});
