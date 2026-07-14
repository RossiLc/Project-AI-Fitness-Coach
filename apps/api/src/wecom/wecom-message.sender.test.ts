import { describe, expect, it, vi } from "vitest";
import { WeComMessageSender } from "./wecom-message.sender.js";

describe("WeComMessageSender", () => {
  it("mock 模式不请求外部 webhook", async () => {
    vi.stubEnv("WECOM_MOCK_MODE", "true");
    vi.stubEnv("WECOM_BOT_WEBHOOK_URL", "");
    const sender = new WeComMessageSender();

    const result = await sender.sendMarkdown("Open Fit 测试消息");

    expect(result.mode).toBe("mock");
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Open Fit 测试消息");
  });
});
