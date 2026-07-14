import { describe, expect, it } from "vitest";
import { MemberRole, type CurrentUser } from "@openfit/shared";
import { WeComService } from "./wecom.service.js";

const admin: CurrentUser = {
  id: "org_admin_demo",
  orgId: "org_demo",
  displayName: "企业管理员老周",
  role: MemberRole.OrgAdmin
};

function createService() {
  const sent: string[] = [];
  const sender = {
    sendMarkdown: async (text: string) => {
      sent.push(text);
      return { mode: "mock" as const, ok: true, message: `mock 已发送：${text}` };
    }
  };
  const prisma = {
    auditLog: {
      create: async ({ data }: { data: { action: string } }) => ({ id: "audit_demo", ...data })
    }
  };
  const leaderboards = {
    current: async () => ({
      entries: [
        { rank: 1, memberName: "员工甲", checkinDays: 2, durationMin: 70 },
        { rank: 2, memberName: "员工乙", checkinDays: 1, durationMin: 100 }
      ]
    })
  };
  return { service: new WeComService(sender as never, prisma as never, leaderboards as never), sent };
}

describe("WeComService", () => {
  it("手动发送测试小贴士", async () => {
    const { service, sent } = createService();

    const result = await service.sendDailyTip(admin);

    expect(result.ok).toBe(true);
    expect(sent[0]).toContain("今日小贴士");
  });

  it("手动发送示例周榜", async () => {
    const { service, sent } = createService();

    const result = await service.sendWeeklyLeaderboard(admin);

    expect(result.ok).toBe(true);
    expect(sent[0]).toContain("本周运动榜");
    expect(sent[0]).toContain("员工甲");
    expect(sent[0]).toContain("有效打卡 2 天");
  });
});
