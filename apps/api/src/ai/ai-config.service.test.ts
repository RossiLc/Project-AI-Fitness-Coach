import { afterEach, describe, expect, it, vi } from "vitest";
import { AiConfigService } from "./ai-config.service.js";

describe("AiConfigService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("默认预留 GPT-5.5 兼容配置并保持 mock 模式", () => {
    vi.stubEnv("AI_MODEL", "");
    vi.stubEnv("AI_API_KEY", "");
    vi.stubEnv("AI_BASE_URL", "");
    const service = new AiConfigService();

    const config = service.getConfig();

    expect(config.mockMode).toBe(true);
    expect(config.provider).toBe("openai-compatible");
    expect(config.model).toBe("gpt-5.5");
    expect(config.apiKey).toBe("");
    expect(config.baseUrl).toBe("");
  });

  it("读取联调时替换的模型 URL 和 key", () => {
    vi.stubEnv("AI_MOCK_MODE", "false");
    vi.stubEnv("AI_BASE_URL", "https://api.example.test/v1");
    vi.stubEnv("AI_API_KEY", "sk-test");
    vi.stubEnv("AI_MODEL", "gpt-5.5");
    const service = new AiConfigService();

    const config = service.getConfig();

    expect(config.mockMode).toBe(false);
    expect(config.baseUrl).toBe("https://api.example.test/v1");
    expect(config.apiKey).toBe("sk-test");
    expect(config.model).toBe("gpt-5.5");
  });
});
