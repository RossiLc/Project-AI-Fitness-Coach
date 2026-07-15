import { CanActivate, ExecutionContext, mixin, Type } from "@nestjs/common";
import { ApiErrorCode, MemberRole } from "@openfit/shared";
import { ApiException } from "../common/api-response.js";
import { resolveMockUser } from "./current-user.decorator.js";

export function AllowRoles(...roles: MemberRole[]): Type<CanActivate> {
  class RoleGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      context.switchToHttp().getRequest();
      const user = resolveMockUser();
      if (!roles.includes(user.role)) {
        throw new ApiException(ApiErrorCode.UnauthorizedRole, "当前角色无权访问该接口", 403);
      }
      return true;
    }
  }
  return mixin(RoleGuardMixin);
}
