import { describe, expect, it } from "vitest";
import { MemberRole } from "@openfit/shared";
import { resolveMockUser } from "./current-user.decorator.js";

describe("resolveMockUser", () => {
  it("默认返回单管理员角色", () => {
    const user = resolveMockUser();

    expect(user.id).toBe("admin_demo");
    expect(user.displayName).toBe("管理员");
    expect(user.role).toBe(MemberRole.OrgAdmin);
  });

  it("忽略历史 mock 角色参数，始终返回单管理员", () => {
    expect(resolveMockUser("employee").role).toBe(MemberRole.OrgAdmin);
    expect(resolveMockUser("activity_admin").role).toBe(MemberRole.OrgAdmin);
    expect(resolveMockUser("org_admin").role).toBe(MemberRole.OrgAdmin);
  });
});
