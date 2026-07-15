import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckinStatus, MemberRole } from "@openfit/shared";
import { recognizeCheckin, submitCheckin } from "./checkins";
import { askCoach } from "./coach";
import { bindMemberWeComUserid, getMembers, getWeComAppStatus, getWeComOAuthLoginUrl, sendWeComAppMessage, sendWeComTestMessage, syncWeComMembers } from "./wecom";
import { getLeaderboard, rebuildLeaderboard } from "./leaderboards";
import { createActivityConfig, getAdminCheckins, invalidateCheckin, retryReminderTask, scanReminderTasks } from "./admin";

describe("web 工作流 API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("今日打卡识别和确认提交使用正确接口", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/checkins/recognize")) {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toMatchObject({ "x-openfit-role": MemberRole.OrgAdmin });
        return response({
          checkinId: "chk_demo",
          status: CheckinStatus.Recognized,
          recognition: {
            sportType: "walking",
            durationMin: 40,
            distanceKm: 4,
            intensity: "moderate",
            confidence: 0.82,
            notice: "规则解析器"
          }
        });
      }
      if (url.endsWith("/api/checkins/chk_demo/submit")) {
        expect(init?.method).toBe("POST");
        return response({ id: "chk_demo", status: CheckinStatus.Submitted, createdAt: new Date().toISOString() });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const recognized = await recognizeCheckin("act_demo", "快走40分钟 4公里");
    const submitted = await submitCheckin(recognized.checkinId, recognized.recognition);

    expect(recognized.status).toBe(CheckinStatus.Recognized);
    expect(submitted.status).toBe(CheckinStatus.Submitted);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("企业微信测试发送使用单管理员请求头", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        expect(init?.headers).toMatchObject({ "x-openfit-role": MemberRole.OrgAdmin });
        return response({ mode: "mock", ok: true, message: "mock 已发送" });
      })
    );

    const result = await sendWeComTestMessage("Open Fit 测试");

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("mock");
  });

  it("企业微信自建应用和成员映射接口可从 Web 调用", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/admin/wecom/app/status")) {
        return response({ mode: "mock", corpIdConfigured: true, agentIdConfigured: true, secretConfigured: false, oauthReady: true, appMessageReady: false, memberSyncReady: false });
      }
      if (url.includes("/api/auth/wecom/login-url")) {
        return response({ mode: "configured", state: "state_1", url: "https://open.weixin.qq.com/connect/oauth2/authorize" });
      }
      if (url.endsWith("/api/admin/wecom/app-message")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ toUserId: "wecom_user_001", text: "提醒打卡" }));
        return response({ mode: "mock", ok: true, message: "mock 已发送" });
      }
      if (url.endsWith("/api/admin/members")) {
        return response([]);
      }
      if (url.endsWith("/api/admin/members/employee_demo/wecom-userid")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ wecomUserid: "wecom_user_001" }));
        return response({ id: "employee_demo", mappingStatus: "bound" });
      }
      if (url.endsWith("/api/admin/members/sync/wecom")) {
        expect(init?.method).toBe("POST");
        return response({ mode: "mock", totalLocalMembers: 3, created: 0, updated: 0, message: "mock" });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await getWeComAppStatus();
    await getWeComOAuthLoginUrl("state_1");
    await sendWeComAppMessage("wecom_user_001", "提醒打卡");
    await getMembers();
    await bindMemberWeComUserid("employee_demo", "wecom_user_001");
    await syncWeComMembers();

    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("AI 教练请求使用 coach advice 接口", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        expect(url).toBe("/api/coach/advice");
        expect(init?.method).toBe("POST");
        return response({ riskLevel: "normal", answer: "建议快走。", model: "gpt-5.5", source: "mock" });
      })
    );

    const result = await askCoach("今天适合快走吗");

    expect(result.model).toBe("gpt-5.5");
    expect(result.answer).toContain("快走");
  });

  it("排行榜读取和重算使用真实接口", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/leaderboards/current?category=checkin_days")) {
        return response({ status: "computed", category: "checkin_days", rule: "按有效打卡天数", generatedAt: new Date().toISOString(), entries: [] });
      }
      if (url.endsWith("/api/leaderboards/rebuild?category=checkin_days")) {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toMatchObject({ "x-openfit-role": MemberRole.OrgAdmin });
        return response({ status: "computed", category: "checkin_days", rule: "按有效打卡天数", generatedAt: new Date().toISOString(), entries: [] });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await getLeaderboard();
    await rebuildLeaderboard();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("管理员打卡作废和提醒扫描使用管理接口", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/admin/checkins")) {
        return response([]);
      }
      if (url.endsWith("/api/admin/checkins/chk_1/invalidate")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(JSON.stringify({ reason: "异常记录" }));
        return response({ id: "chk_1", status: CheckinStatus.Invalid, createdAt: new Date().toISOString() });
      }
      if (url.endsWith("/api/admin/reminders/scan")) {
        expect(init?.method).toBe("POST");
        return response({ created: 1 });
      }
      if (url.endsWith("/api/admin/reminders/rem_1/retry")) {
        expect(init?.method).toBe("POST");
        return response({ id: "rem_1", status: "eligible" });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await getAdminCheckins();
    await invalidateCheckin("chk_1", "异常记录");
    await scanReminderTasks();
    await retryReminderTask("rem_1");

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("新增活动配置使用 POST 接口", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        expect(url).toBe("/api/activities/configs");
        expect(init?.method).toBe("POST");
        expect(init?.headers).toMatchObject({ "x-openfit-role": MemberRole.OrgAdmin });
        expect(init?.body).toBe(
          JSON.stringify({
            name: "九月运动打卡",
            content: "每天提交运动内容和图片。",
            startAt: "2026-09-01",
            endAt: "2026-09-30"
          })
        );
        return response({
          id: "act_new",
          name: "九月运动打卡",
          content: "每天提交运动内容和图片。",
          status: "draft",
          startAt: new Date().toISOString(),
          endAt: new Date().toISOString(),
          reminderTime: "20:00"
        });
      })
    );

    const result = await createActivityConfig({
      name: "九月运动打卡",
      content: "每天提交运动内容和图片。",
      startAt: "2026-09-01",
      endAt: "2026-09-30"
    });

    expect(result.id).toBe("act_new");
  });
});

function response(body: unknown) {
  return {
    ok: true,
    json: async () => body
  } as Response;
}
