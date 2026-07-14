import { afterEach, describe, expect, it, vi } from "vitest";
import { AiConfigService } from "./ai-config.service.js";
import { AiProviderService } from "./ai-provider.service.js";

describe("AiProviderService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("教练咨询未配置模型时不模拟回答，返回未配置状态", async () => {
    vi.stubEnv("AI_MOCK_MODE", "true");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const service = new AiProviderService(new AiConfigService());

    const result = await service.generateCoachAdvice("今天适合快走吗");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.source).toBe("unconfigured");
    expect(result.model).toBe("gpt-5.5");
    expect(result.answer).toContain("AI 服务尚未配置");
  });

  it("非 mock 模式调用 OpenAI-compatible chat completions", async () => {
    vi.stubEnv("AI_MOCK_MODE", "false");
    vi.stubEnv("AI_BASE_URL", "https://api.example.test/v1");
    vi.stubEnv("AI_API_KEY", "sk-test");
    vi.stubEnv("AI_MODEL", "gpt-5.5");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "模型建议：低强度快走 20 分钟。" } }] })
    }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new AiProviderService(new AiConfigService());

    const result = await service.generateCoachAdvice("今天适合快走吗");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer sk-test" })
      })
    );
    expect(result.source).toBe("model");
    expect(result.answer).toContain("模型建议");
  });

  it("教练咨询模型调用失败时返回模型错误状态，不伪造 AI 回复", async () => {
    vi.stubEnv("AI_MOCK_MODE", "false");
    vi.stubEnv("AI_BASE_URL", "https://api.example.test/v1");
    vi.stubEnv("AI_API_KEY", "sk-test");
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({})
    }));
    vi.stubGlobal("fetch", fetchMock);
    const service = new AiProviderService(new AiConfigService());

    const result = await service.generateCoachAdvice("今天适合快走吗");

    expect(result.source).toBe("model_error");
    expect(result.answer).toContain("AI 模型调用失败");
  });
});
