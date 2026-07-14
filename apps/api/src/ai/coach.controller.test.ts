import { describe, expect, it } from "vitest";
import { CoachController } from "./coach.controller.js";

describe("CoachController", () => {
  it("返回 AI 教练建议", async () => {
    const controller = new CoachController({
      advise: async () => ({
        riskLevel: "normal",
        answer: "建议低强度快走。",
        model: "gpt-5.5",
        source: "model"
      })
    } as never);

    const result = await controller.advise({ question: "今天适合快走吗" });

    expect(result.model).toBe("gpt-5.5");
    expect(result.answer).toContain("快走");
  });
});
