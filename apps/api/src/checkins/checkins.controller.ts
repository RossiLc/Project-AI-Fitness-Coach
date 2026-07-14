import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import type { CurrentUser, RecognizeCheckinRequest, SubmitCheckinRequest } from "@openfit/shared";
import { CurrentUserDecorator } from "../auth/current-user.decorator.js";
import { CheckinsService } from "./checkins.service.js";

@Controller("checkins")
export class CheckinsController {
  constructor(@Inject(CheckinsService) private readonly checkins: CheckinsService) {}

  @Post("recognize")
  recognize(@CurrentUserDecorator() user: CurrentUser, @Body() body: RecognizeCheckinRequest) {
    return this.checkins.recognize(user, body.activityId, body.text);
  }

  @Post(":id/submit")
  submit(@CurrentUserDecorator() user: CurrentUser, @Param("id") id: string, @Body() body: SubmitCheckinRequest) {
    return this.checkins.submit(user, id, body);
  }

  @Get("mine")
  mine(@CurrentUserDecorator() user: CurrentUser) {
    return this.checkins.mine(user);
  }
}
