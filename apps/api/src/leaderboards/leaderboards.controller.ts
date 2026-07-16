import { Controller, Get, Inject, Post, Query, UseGuards } from "@nestjs/common";
import { MemberRole, type LeaderboardCategory } from "@openfit/shared";
import { AllowRoles } from "../auth/role-guard.factory.js";
import { LeaderboardsService } from "./leaderboards.service.js";

@Controller("leaderboards")
export class LeaderboardsController {
  constructor(@Inject(LeaderboardsService) private readonly leaderboards: LeaderboardsService) {}

  @Get("current")
  current(@Query("category") category?: LeaderboardCategory, @Query("groupId") groupId?: string) {
    return this.leaderboards.current(normalizeCategory(category), groupId);
  }

  @Post("rebuild")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  rebuild(@Query("category") category?: LeaderboardCategory, @Query("groupId") groupId?: string) {
    return this.leaderboards.rebuildSnapshot(normalizeCategory(category), groupId);
  }
}

function normalizeCategory(category?: LeaderboardCategory): LeaderboardCategory {
  if (category === "duration_min" || category === "calorie_estimate") return category;
  return "checkin_days";
}
