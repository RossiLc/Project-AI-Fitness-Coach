import { describe, expect, it } from "vitest";
import { MemberRole } from "@openfit/shared";
import { getApiRole, setApiRole } from "./client";

describe("web api client role state", () => {
  it("支持第一阶段 mock 角色切换", () => {
    setApiRole(MemberRole.OrgAdmin);
    expect(getApiRole()).toBe(MemberRole.OrgAdmin);

    setApiRole(MemberRole.Employee);
    expect(getApiRole()).toBe(MemberRole.Employee);
  });
});
