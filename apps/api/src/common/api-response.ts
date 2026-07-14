import { HttpException, HttpStatus } from "@nestjs/common";
import type { ApiErrorCode } from "@openfit/shared";

export class ApiException extends HttpException {
  constructor(
    readonly code: ApiErrorCode | string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    readonly detail?: unknown
  ) {
    super({ error: { code, message, detail } }, status);
  }
}
