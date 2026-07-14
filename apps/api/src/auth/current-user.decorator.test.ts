import { describe, expect, it } from "vitest";
import { MemberRole } from "@openfit/shared";
import { resolveMockUser } from "./current-user.decorator.js";

describe("resolveMockUser", () => {
  it("默认返回员工角色", () => {
    const user = resolveMockUser();

    expect(user.id).toBe("employee_demo");
    expect(user.role).toBe(MemberRole.Employee);
  });

  it("支持活动管理员和企业管理员角色切换", () => {
    expect(resolveMockUser("activity_admin").role).toBe(MemberRole.ActivityAdmin);
    expect(resolveMockUser("org_admin").role).toBe(MemberRole.OrgAdmin);
  });
});
