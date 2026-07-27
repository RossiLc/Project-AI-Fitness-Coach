import type {
  ActivityConfigDto,
  AdminCheckinDto,
  CheckinRecordDto,
  CreateActivityConfigRequest,
  DashboardSummary,
  GroupMissingCheckinReminderResult,
  ImportGroupMemberByUseridRow,
  ImportGroupMembersByUseridResult,
  MemberCheckinHistoryDto,
  MemberDto,
  PushCampaignDto,
  CreatePushCampaignRequest,
  UpdatePushCampaignRequest,
  ReminderTaskDto,
  UpdateActivityConfigRequest,
  WeComGroupDto
} from "@openfit/shared";
import { apiFetch } from "./client";
import { buildApiUrl } from "./client";

function withGroup(path: string, groupId?: string, hasQuery = false) {
  if (!groupId) return path;
  return `${path}${hasQuery ? "&" : "?"}groupId=${encodeURIComponent(groupId)}`;
}

export function getGroups() {
  return apiFetch<WeComGroupDto[]>("/api/admin/groups");
}

export function createGroup(name: string) {
  return apiFetch<WeComGroupDto>("/api/admin/groups", {
    method: "POST",
    body: JSON.stringify({ name })
  });
}

export function importGroupMembersByUseridRows(groupId: string, rows: ImportGroupMemberByUseridRow[]) {
  return apiFetch<ImportGroupMembersByUseridResult>(`/api/admin/groups/${encodeURIComponent(groupId)}/import-members-by-userid`, {
    method: "POST",
    body: JSON.stringify({ rows })
  });
}

export function getDashboardSummary(groupId?: string) {
  return apiFetch<DashboardSummary>(withGroup("/api/admin/dashboard/summary", groupId));
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

export function sendGroupMissingCheckinReminder(groupId?: string) {
  return apiFetch<GroupMissingCheckinReminderResult>(withGroup("/api/admin/reminders/group-missing-checkins", groupId), {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function getPushCampaigns(groupId?: string) {
  return apiFetch<PushCampaignDto[]>(withGroup("/api/admin/push-campaigns", groupId));
}

export function createPushCampaign(body: CreatePushCampaignRequest) {
  return apiFetch<PushCampaignDto>("/api/admin/push-campaigns", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function updatePushCampaign(id: string, body: UpdatePushCampaignRequest) {
  return apiFetch<PushCampaignDto>(`/api/admin/push-campaigns/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

export function sendPushCampaignNow(id: string) {
  return apiFetch<PushCampaignDto>(`/api/admin/push-campaigns/${encodeURIComponent(id)}/send-now`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function deletePushCampaign(id: string) {
  return apiFetch<{ id: string; deleted: true }>(`/api/admin/push-campaigns/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export function getMembers(missingToday = false, groupId?: string) {
  const path = `/api/admin/members${missingToday ? "?missingToday=true" : ""}`;
  return apiFetch<MemberDto[]>(withGroup(path, groupId, missingToday));
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

export function getActivityConfig(groupId?: string) {
  return apiFetch<ActivityConfigDto | null>(withGroup("/api/activities/current/config", groupId));
}

export function getActivityConfigs(groupId?: string) {
  return apiFetch<ActivityConfigDto[]>(withGroup("/api/activities/configs", groupId));
}

export function createActivityConfig(body: CreateActivityConfigRequest, groupId?: string) {
  return apiFetch<ActivityConfigDto>(withGroup("/api/activities/configs", groupId), {
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
