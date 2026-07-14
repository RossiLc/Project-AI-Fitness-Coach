import { Body, Controller, Inject, Post } from "@nestjs/common";
import type { CoachAdviceRequest } from "@openfit/shared";
import { CoachService } from "./coach.service.js";

@Controller("coach")
export class CoachController {
  constructor(@Inject(CoachService) private readonly coach: CoachService) {}

  @Post("advice")
  advise(@Body() body: CoachAdviceRequest) {
    return this.coach.advise(body.question);
  }
}
