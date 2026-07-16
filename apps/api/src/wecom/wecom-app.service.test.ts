import { afterEach, describe, expect, it, vi } from "vitest";
import { WeComAppService } from "./wecom-app.service.js";

describe("WeComAppService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns app config status without exposing secret", () => {
    const service = new WeComAppService({
      get: (key: string) =>
        ({
          WECOM_CORP_ID: "corp_demo",
          WECOM_AGENT_ID: "agent_demo",
          WECOM_APP_SECRET: "secret_demo",
          WECOM_APP_CALLBACK_URL: "http://localhost/callback"
        })[key]
    } as never);

    const status = service.getStatus();

    expect(status.mode).toBe("configured");
    expect(status.corpIdConfigured).toBe(true);
    expect(status.agentIdConfigured).toBe(true);
    expect(status.secretConfigured).toBe(true);
    expect(JSON.stringify(status)).not.toContain("secret_demo");
  });

  it("builds WeCom OAuth login URL", () => {
    const service = new WeComAppService({
      get: (key: string) =>
        ({
          WECOM_CORP_ID: "corp_demo",
          WECOM_AGENT_ID: "1000002",
          WECOM_APP_CALLBACK_URL: "http://localhost:13100/api/auth/wecom/callback"
        })[key]
    } as never);

    const result = service.buildOAuthLoginUrl("state_1");

    expect(result.mode).toBe("configured");
    expect(result.url).toContain("appid=corp_demo");
    expect(result.url).toContain("agentid=1000002");
    expect(result.state).toBe("state_1");
  });

  it("accepts mock-prefixed OAuth code only as a test code format", async () => {
    const service = new WeComAppService({ get: () => undefined } as never);
    const members = {
      findByWeComUserid: async () => ({
        id: "employee_demo",
        orgId: "org_demo",
        displayName: "员工小李",
        role: "employee"
      })
    };

    const result = await service.handleOAuthCallback({ code: "mock:wecom_user_001", state: "state_1" }, members as never);

    expect(result.mode).toBe("mock");
    expect(result.user.id).toBe("employee_demo");
  });

  it("sends app message through real WeCom API path", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ errcode: 0, access_token: "token_demo", expires_in: 7200 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ errcode: 0 }) });
    vi.stubGlobal("fetch", fetchMock);
    const service = new WeComAppService({
      get: (key: string) =>
        ({
          WECOM_CORP_ID: "corp_demo",
          WECOM_APP_SECRET: "secret_demo",
          WECOM_AGENT_ID: "1000002"
        })[key]
    } as never);

    const result = await service.sendAppMessage({ toUserId: "wecom_user_001", text: "请完成今日打卡" });

    expect(result.mode).toBe("wecom_api");
    expect(result.ok).toBe(true);
    expect(result.message).toContain("wecom_user_001");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
