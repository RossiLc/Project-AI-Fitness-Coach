import type {
  ActivityConfigDto,
  AdminCheckinDto,
  CheckinRecordDto,
  CreateActivityConfigRequest,
  DashboardSummary,
  GroupMissingCheckinReminderResult,
  MemberCheckinHistoryDto,
  MemberDto,
  ReminderTaskDto,
  UpdateActivityConfigRequest
} from "@openfit/shared";
import { apiFetch } from "./client";
import { buildApiUrl } from "./client";

export function getDashboardSummary() {
  return apiFetch<DashboardSummary>("/api/admin/dashboard/summary");
}

export function getReminderTasks() {
  return apiFetch<ReminderTaskDto[]>("/api/admin/reminders");
}

export function scanReminderTasks() {
  return apiFetch<{ activityId: string; date: string; created: number; status: string }>("/api/admin/reminders/scan", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function retryReminderTask(id: string) {
  return apiFetch<ReminderTaskDto>(`/api/admin/reminders/${id}/retry`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function sendPersonalReminder(id: string) {
  return apiFetch<ReminderTaskDto>(`/api/admin/reminders/${id}/send-personal`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function sendGroupMissingCheckinReminder() {
  return apiFetch<GroupMissingCheckinReminderResult>("/api/admin/reminders/group-missing-checkins", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function getMembers(missingToday = false) {
  const query = missingToday ? "?missingToday=true" : "";
  return apiFetch<MemberDto[]>(`/api/admin/members${query}`);
}

export function getMemberCheckins(id: string) {
  return apiFetch<MemberCheckinHistoryDto>(`/api/admin/members/${id}/checkins`);
}

export function getAttachmentPreviewUrl(id: string) {
  return buildApiUrl(`/api/files/${encodeURIComponent(id)}/content`);
}

export function getAdminCheckins() {
  return apiFetch<AdminCheckinDto[]>("/api/admin/checkins");
}

export function invalidateCheckin(id: string, reason: string) {
  return apiFetch<CheckinRecordDto>(`/api/admin/checkins/${id}/invalidate`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export function restoreCheckin(id: string) {
  return apiFetch<CheckinRecordDto>(`/api/admin/checkins/${id}/restore`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function getActivityConfig() {
  return apiFetch<ActivityConfigDto | null>("/api/activities/current/config");
}

export function getActivityConfigs() {
  return apiFetch<ActivityConfigDto[]>("/api/activities/configs");
}

export function createActivityConfig(body: CreateActivityConfigRequest) {
  return apiFetch<ActivityConfigDto>("/api/activities/configs", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function updateActivityConfig(id: string, body: UpdateActivityConfigRequest) {
  return apiFetch<ActivityConfigDto>(`/api/activities/${id}/config`, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}
