import type { LeaderboardCategory, LeaderboardDto } from "@openfit/shared";
import { apiFetch } from "./client";

export function getLeaderboard(category: LeaderboardCategory = "checkin_days", groupId?: string) {
  const groupQuery = groupId ? `&groupId=${encodeURIComponent(groupId)}` : "";
  return apiFetch<LeaderboardDto>(`/api/leaderboards/current?category=${encodeURIComponent(category)}${groupQuery}`);
}

export function rebuildLeaderboard(category: LeaderboardCategory = "checkin_days", groupId?: string) {
  const groupQuery = groupId ? `&groupId=${encodeURIComponent(groupId)}` : "";
  return apiFetch<LeaderboardDto & { snapshotId?: string }>(`/api/leaderboards/rebuild?category=${encodeURIComponent(category)}${groupQuery}`, {
    method: "POST",
    body: JSON.stringify({})
  });
}
