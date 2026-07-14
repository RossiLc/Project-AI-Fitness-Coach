import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ApiErrorCode, MemberRole } from "@openfit/shared";
import { ApiException } from "../common/api-response.js";
import { resolveMockUser } from "./current-user.decorator.js";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly allowedRoles: MemberRole[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ query: { role?: string }; headers: Record<string, string | string[] | undefined> }>();
    const headerRole = request.headers["x-openfit-role"];
    const role = Array.isArray(headerRole) ? headerRole[0] : headerRole ?? request.query.role;
    const user = resolveMockUser(role);
    if (!this.allowedRoles.includes(user.role)) {
      throw new ApiException(ApiErrorCode.UnauthorizedRole, "当前角色无权访问该接口", 403);
    }
    return true;
  }
}
