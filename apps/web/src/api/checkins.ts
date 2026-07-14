import type { AttachmentDto, CheckinRecordDto, RecognizeCheckinResponse, SubmitCheckinRequest, UploadAttachmentRequest } from "@openfit/shared";
import { apiFetch } from "./client";

export function recognizeCheckin(activityId: string, text: string) {
  return apiFetch<RecognizeCheckinResponse>("/api/checkins/recognize", {
    method: "POST",
    body: JSON.stringify({ activityId, sourceType: "text", text })
  });
}

export function submitCheckin(id: string, body: SubmitCheckinRequest) {
  return apiFetch<CheckinRecordDto>(`/api/checkins/${id}/submit`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function getMyCheckins() {
  return apiFetch<CheckinRecordDto[]>("/api/checkins/mine");
}

export function uploadAttachment(body: UploadAttachmentRequest) {
  return apiFetch<AttachmentDto>("/api/files/upload", {
    method: "POST",
    body: JSON.stringify(body)
  });
}
