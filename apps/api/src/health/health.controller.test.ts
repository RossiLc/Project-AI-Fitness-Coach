import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("返回 API 健康状态", () => {
    const result = new HealthController().getHealth();

    expect(result).toEqual({
      status: "ok",
      service: "openfit-api",
      version: "0.1.0"
    });
  });
});
