import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ApiErrorCode, MemberRole } from "@openfit/shared";
import { ApiException } from "../common/api-response.js";
import { resolveMockUser } from "./current-user.decorator.js";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly allowedRoles: MemberRole[]) {}

  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest();
    const user = resolveMockUser();
    if (!this.allowedRoles.includes(user.role)) {
      throw new ApiException(ApiErrorCode.UnauthorizedRole, "当前角色无权访问该接口", 403);
    }
    return true;
  }
}
