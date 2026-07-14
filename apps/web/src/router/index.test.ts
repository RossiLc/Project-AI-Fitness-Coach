import { describe, expect, it } from "vitest";
import { routes } from "./routes";

describe("web router", () => {
  it("默认入口进入管理员运营看板", () => {
    expect(routes[0]).toMatchObject({ path: "/", redirect: "/admin/dashboard" });
  });
});
