import type {
  MemberDto,
  WeComSendResult
} from "@openfit/shared";
import { apiFetch } from "./client";

export function sendWeComTestMessage(previewText: string) {
  return apiFetch<WeComSendResult>("/api/admin/wecom/test-message", {
    method: "POST",
    body: JSON.stringify({ previewText })
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
