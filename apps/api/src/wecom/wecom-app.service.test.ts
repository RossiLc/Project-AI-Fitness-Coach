import { describe, expect, it } from "vitest";
import { WeComAppService } from "./wecom-app.service.js";

describe("WeComAppService", () => {
  it("返回自建应用配置状态，不暴露 secret", () => {
    const service = new WeComAppService({
      get: (key: string) =>
        ({
          WECOM_CORP_ID: "corp_demo",
          WECOM_AGENT_ID: "agent_demo",
          WECOM_APP_SECRET: "secret_demo",
          WECOM_APP_CALLBACK_URL: "http://localhost/callback",
          WECOM_MOCK_MODE: "true"
        })[key]
    } as never);

    const status = service.getStatus();

    expect(status.corpIdConfigured).toBe(true);
    expect(status.agentIdConfigured).toBe(true);
    expect(status.secretConfigured).toBe(true);
    expect(JSON.stringify(status)).not.toContain("secret_demo");
  });

  it("生成企业微信 OAuth 登录 URL", () => {
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

  it("mock OAuth 回调用 code 绑定到本地成员", async () => {
    const service = new WeComAppService({ get: () => "true" } as never);
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

  it("mock 发送自建应用消息时不请求外部网络", async () => {
    const service = new WeComAppService({ get: () => "true" } as never);

    const result = await service.sendAppMessage({ toUserId: "wecom_user_001", text: "请完成今日打卡" });

    expect(result.mode).toBe("mock");
    expect(result.ok).toBe(true);
    expect(result.message).toContain("wecom_user_001");
  });
});
