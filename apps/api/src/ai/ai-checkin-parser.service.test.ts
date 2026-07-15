import { describe, expect, it } from "vitest";
import { AiCheckinParserService } from "./ai-checkin-parser.service.js";

describe("AiCheckinParserService", () => {
  it("mock 模式下返回结构化文本打卡解析结果", async () => {
    const provider = {
      parseCheckinText: async (text: string) => ({
        sportType: text.includes("跑") ? "跑步" : "综合运动",
        durationMin: 35,
        distanceKm: 5,
        intensity: "moderate" as const,
        calorieEstimate: 298,
        confidence: 0.88,
        notice: "AI 解析，需用户确认。"
      })
    };
    const service = new AiCheckinParserService(provider as never);

    const result = await service.parse("晚上跑步 35 分钟 5 公里");

    expect(result.sportType).toBe("跑步");
    expect(result.durationMin).toBe(35);
    expect(result.notice).toContain("确认");
  });

  it("通过 provider 解析图片打卡", async () => {
    const provider = {
      parseCheckinImage: async () => ({
        sportType: "跑步",
        durationMin: 30,
        distanceKm: 5,
        intensity: "moderate" as const,
        calorieEstimate: 255,
        confidence: 0.74,
        notice: "AI 图片识别结果需用户确认。"
      })
    };
    const service = new AiCheckinParserService(provider as never);

    const result = await service.parseImage({
      textHint: "",
      attachments: [{ kind: "image", mediaId: "media_001", mimeType: "image/jpeg" }]
    });

    expect(result.sportType).toBe("跑步");
    expect(result.notice).toContain("图片识别");
  });
});
