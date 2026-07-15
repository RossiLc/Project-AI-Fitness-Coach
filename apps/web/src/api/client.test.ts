import { describe, expect, it } from "vitest";
import { MemberRole } from "@openfit/shared";
import { buildApiUrl, getApiRole, setApiRole } from "./client";

describe("web api client role state", () => {
  it("固定使用单管理员角色，忽略历史 mock 角色切换", () => {
    setApiRole(MemberRole.OrgAdmin);
    expect(getApiRole()).toBe(MemberRole.OrgAdmin);

    setApiRole(MemberRole.Employee);
    expect(getApiRole()).toBe(MemberRole.OrgAdmin);
  });

  it("生成 API 资源 URL", () => {
    expect(buildApiUrl("/api/files/att_1/content")).toBe("/api/files/att_1/content");
  });
});
