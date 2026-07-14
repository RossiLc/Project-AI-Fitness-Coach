import { Controller, Get, Inject, Post, UseGuards } from "@nestjs/common";
import { MemberRole } from "@openfit/shared";
import { AllowRoles } from "../auth/role-guard.factory.js";
import { LeaderboardsService } from "./leaderboards.service.js";

@Controller("leaderboards")
export class LeaderboardsController {
  constructor(@Inject(LeaderboardsService) private readonly leaderboards: LeaderboardsService) {}

  @Get("current")
  current() {
    return this.leaderboards.current();
  }

  @Post("rebuild")
  @UseGuards(AllowRoles(MemberRole.ActivityAdmin, MemberRole.OrgAdmin))
  rebuild() {
    return this.leaderboards.rebuildSnapshot();
  }
}
