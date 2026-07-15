import { describe, expect, it } from "vitest";
import { RuleRecognizerService } from "./rule-recognizer.service.js";

describe("RuleRecognizerService", () => {
  it("从中文运动文本中识别运动类型、时长和距离", () => {
    const service = new RuleRecognizerService();

    const result = service.recognize("今天快走 40 分钟，大概 4 公里");

    expect(result.sportType).toBe("快走");
    expect(result.durationMin).toBe(40);
    expect(result.distanceKm).toBe(4);
    expect(result.intensity).toBe("moderate");
    expect(result.notice).toContain("规则解析器");
  });
});
