import { describe, expect, it } from "vitest";
import { routes } from "./routes";

describe("web router", () => {
  it("默认入口进入管理员运营看板", () => {
    expect(routes[0]).toMatchObject({ path: "/", redirect: "/admin/dashboard" });
  });

  it("提供推送管理路由", () => {
    expect(routes.some((route) => route.path === "/admin/pushes")).toBe(true);
  });

  it("提供单聊推送独立模块路由", () => {
    expect(routes.some((route) => route.path === "/admin/direct-message")).toBe(true);
  });
});
