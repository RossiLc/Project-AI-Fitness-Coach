import { Controller, Get } from "@nestjs/common";
import type { CurrentUser } from "@openfit/shared";
import { CurrentUserDecorator } from "./current-user.decorator.js";

@Controller("me")
export class MeController {
  @Get()
  getMe(@CurrentUserDecorator() user: CurrentUser) {
    return user;
  }
}
