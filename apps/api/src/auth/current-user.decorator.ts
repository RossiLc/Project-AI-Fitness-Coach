import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { MemberRole, type CurrentUser } from "@openfit/shared";

const adminUser: CurrentUser = {
  id: "admin_demo",
  orgId: "org_demo",
  displayName: "管理员",
  role: MemberRole.OrgAdmin
};

export function resolveMockUser(_role?: string): CurrentUser {
  return adminUser;
}

export const CurrentUserDecorator = createParamDecorator((_data: unknown, _ctx: ExecutionContext) => {
  return resolveMockUser();
});
