import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { MemberRole, type CurrentUser } from "@openfit/shared";

const roleToUser: Record<MemberRole, CurrentUser> = {
  [MemberRole.Employee]: {
    id: "employee_demo",
    orgId: "org_demo",
    displayName: "员工小李",
    role: MemberRole.Employee
  },
  [MemberRole.ActivityAdmin]: {
    id: "admin_demo",
    orgId: "org_demo",
    displayName: "活动管理员王姐",
    role: MemberRole.ActivityAdmin
  },
  [MemberRole.OrgAdmin]: {
    id: "org_admin_demo",
    orgId: "org_demo",
    displayName: "企业管理员老周",
    role: MemberRole.OrgAdmin
  }
};

export function resolveMockUser(role?: string): CurrentUser {
  if (role === MemberRole.ActivityAdmin) return roleToUser[MemberRole.ActivityAdmin];
  if (role === MemberRole.OrgAdmin) return roleToUser[MemberRole.OrgAdmin];
  return roleToUser[MemberRole.Employee];
}

export const CurrentUserDecorator = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ query: { role?: string }; headers: Record<string, string | string[] | undefined> }>();
  const headerRole = request.headers["x-openfit-role"];
  const role = Array.isArray(headerRole) ? headerRole[0] : headerRole ?? request.query.role;
  return resolveMockUser(role);
});
