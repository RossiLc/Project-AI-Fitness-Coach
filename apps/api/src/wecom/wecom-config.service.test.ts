import { afterEach, describe, expect, it, vi } from "vitest";
import { WeComConfigService } from "./wecom-config.service.js";

describe("WeComConfigService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("预留企业微信智能机器人长连接和群机器人联调配置", () => {
    vi.stubEnv("WECOM_INTELLIGENT_BOT_WS_URL", "wss://openws.work.weixin.qq.com");
    vi.stubEnv("WECOM_INTELLIGENT_BOT_ID", "bot-demo");
    vi.stubEnv("WECOM_CHECKIN_BOT_ID", "checkin-bot");
    vi.stubEnv("WECOM_CHECKIN_BOT_SECRET", "checkin-secret");
    vi.stubEnv("WECOM_COACH_BOT_ID", "coach-bot");
    vi.stubEnv("WECOM_COACH_BOT_SECRET", "coach-secret");
    vi.stubEnv("WECOM_BOT_WEBHOOK_URL", "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=demo");

    const config = new WeComConfigService().getConfig();

    expect(config.intelligentBotWsUrl).toBe("wss://openws.work.weixin.qq.com");
    expect(config.intelligentBotId).toBe("bot-demo");
    expect(config.checkinBotId).toBe("checkin-bot");
    expect(config.checkinBotSecret).toBe("checkin-secret");
    expect(config.coachBotId).toBe("coach-bot");
    expect(config.coachBotSecret).toBe("coach-secret");
    expect(config.groupBotWebhookUrl).toContain("qyapi.weixin.qq.com");
  });
});
