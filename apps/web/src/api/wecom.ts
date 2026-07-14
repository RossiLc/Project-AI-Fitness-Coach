import type {
  MemberDto,
  SyncWeComMembersResponse,
  WeComAppMessageResult,
  WeComAppStatusDto,
  WeComOAuthLoginUrlResponse,
  WeComSendResult
} from "@openfit/shared";
import { apiFetch } from "./client";

export function sendWeComTestMessage(previewText: string) {
  return apiFetch<WeComSendResult>("/api/admin/wecom/test-message", {
    method: "POST",
    body: JSON.stringify({ previewText })
  });
}

export function getWeComAppStatus() {
  return apiFetch<WeComAppStatusDto>("/api/admin/wecom/app/status");
}

export function getWeComOAuthLoginUrl(state = "openfit_web_preview") {
  return apiFetch<WeComOAuthLoginUrlResponse>(`/api/auth/wecom/login-url?state=${encodeURIComponent(state)}`);
}

export function sendWeComAppMessage(toUserId: string, text: string) {
  return apiFetch<WeComAppMessageResult>("/api/admin/wecom/app-message", {
    method: "POST",
    body: JSON.stringify({ toUserId, text })
  });
}

export function getMembers() {
  return apiFetch<MemberDto[]>("/api/admin/members");
}

export function bindMemberWeComUserid(id: string, wecomUserid: string) {
  return apiFetch<MemberDto>(`/api/admin/members/${id}/wecom-userid`, {
    method: "POST",
    body: JSON.stringify({ wecomUserid })
  });
}

export function syncWeComMembers() {
  return apiFetch<SyncWeComMembersResponse>("/api/admin/members/sync/wecom", {
    method: "POST",
    body: JSON.stringify({})
  });
}
