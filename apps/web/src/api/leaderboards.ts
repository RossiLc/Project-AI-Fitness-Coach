import type { LeaderboardCategory, LeaderboardDto } from "@openfit/shared";
import { apiFetch } from "./client";

export function getLeaderboard(category: LeaderboardCategory = "checkin_days") {
  return apiFetch<LeaderboardDto>(`/api/leaderboards/current?category=${encodeURIComponent(category)}`);
}

export function rebuildLeaderboard(category: LeaderboardCategory = "checkin_days") {
  return apiFetch<LeaderboardDto & { snapshotId?: string }>(`/api/leaderboards/rebuild?category=${encodeURIComponent(category)}`, {
    method: "POST",
    body: JSON.stringify({})
  });
}
