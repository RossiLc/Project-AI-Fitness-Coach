import { CanActivate, ExecutionContext, mixin, Type } from "@nestjs/common";
import { ApiErrorCode, MemberRole } from "@openfit/shared";
import { ApiException } from "../common/api-response.js";
import { resolveMockUser } from "./current-user.decorator.js";

export function AllowRoles(...roles: MemberRole[]): Type<CanActivate> {
  class RoleGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<{ query: { role?: string }; headers: Record<string, string | string[] | undefined> }>();
      const headerRole = request.headers["x-openfit-role"];
      const role = Array.isArray(headerRole) ? headerRole[0] : headerRole ?? request.query.role;
      const user = resolveMockUser(role);
      if (!roles.includes(user.role)) {
        throw new ApiException(ApiErrorCode.UnauthorizedRole, "当前角色无权访问该接口", 403);
      }
      return true;
    }
  }
  return mixin(RoleGuardMixin);
}
