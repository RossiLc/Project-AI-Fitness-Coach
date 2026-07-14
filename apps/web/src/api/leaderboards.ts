import type { LeaderboardDto } from "@openfit/shared";
import { apiFetch } from "./client";

export function getLeaderboard() {
  return apiFetch<LeaderboardDto>("/api/leaderboards/current");
}

export function rebuildLeaderboard() {
  return apiFetch<LeaderboardDto & { snapshotId?: string }>("/api/leaderboards/rebuild", {
    method: "POST",
    body: JSON.stringify({})
  });
}
