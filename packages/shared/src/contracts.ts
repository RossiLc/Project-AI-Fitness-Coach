import type { BotIntent, CheckinStatus, MemberRole, ReminderStatus } from "./status.js";

export interface CurrentUser {
  id: string;
  orgId: string;
  displayName: string;
  role: MemberRole;
  wecomUserid?: string;
}

export interface RecognizeCheckinRequest {
  activityId: string;
  sourceType: "text";
  text: string;
}

export interface RecognitionResultDto {
  sportType: string;
  durationMin: number;
  distanceKm?: number;
  intensity: "low" | "moderate" | "high";
  calorieEstimate?: number;
  confidence: number;
  notice: string;
}

export interface RecognizeCheckinResponse {
  checkinId: string;
  status: CheckinStatus;
  recognition: RecognitionResultDto;
}

export interface SubmitCheckinRequest {
  sportType: string;
  durationMin: number;
  distanceKm?: number;
  intensity: "low" | "moderate" | "high";
  calorieEstimate?: number;
}

export interface CheckinRecordDto {
  id: string;
  activityId: string;
  memberId: string;
  status: CheckinStatus;
  sportType?: string;
  durationMin?: number;
  distanceKm?: number;
  intensity?: string;
  calorieEstimate?: number;
  submittedAt?: string;
  createdAt: string;
}

export interface AttachmentDto {
  id: string;
  checkinId?: string;
  localPath: string;
  mimeType: string;
  sizeBytes: number;
  status: "active" | "deleted";
  createdAt: string;
}

export interface UploadAttachmentRequest {
  checkinId?: string;
  activityId: string;
  filename: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  base64Data: string;
}

export interface DashboardSummary {
  todayCheckinCount: number;
  checkinRate: number;
  missingCount: number;
  totalMemberCount: number;
  totalDurationMin: number;
  pendingIssueCount: number;
}

export interface ActivityConfigDto {
  id: string;
  name: string;
  content: string;
  status: string;
  startAt: string;
  endAt: string;
  reminderTime: string;
  rankingPrimary: "checkin_days";
  rankingSecondary: "duration_min";
  makeupWindowDays: number;
}

export interface UpdateActivityConfigRequest {
  name: string;
  content: string;
  startAt: string;
  endAt: string;
}

export interface CreateActivityConfigRequest {
  name: string;
  content: string;
  startAt: string;
  endAt: string;
}

export interface ReminderTaskDto {
  id: string;
  memberName: string;
  remindDate: string;
  channel: "wecom_app" | "web_manual" | "group_bot";
  status: ReminderStatus;
  attemptCount: number;
  lastError?: string;
}

export interface LeaderboardEntryDto {
  rank: number;
  memberId: string;
  memberName: string;
  checkinDays: number;
  durationMin: number;
  calorieEstimate: number;
}

export interface LeaderboardDto {
  status: "computed" | "empty";
  category: LeaderboardCategory;
  rule: string;
  generatedAt: string;
  entries: LeaderboardEntryDto[];
}

export type LeaderboardCategory = "checkin_days" | "duration_min" | "calorie_estimate";

export interface AdminCheckinDto extends CheckinRecordDto {
  memberName: string;
  attachments?: AttachmentDto[];
}

export interface InvalidateCheckinRequest {
  reason: string;
}

export interface WeComTestMessageRequest {
  previewText: string;
}

export interface WeComSendResult {
  mode: "intelligent_bot";
  ok: boolean;
  message: string;
}

export interface MemberDto {
  id: string;
  displayName: string;
  department?: string;
  role: MemberRole;
  status: string;
  externalId?: string;
  wecomUserid?: string;
  mappingStatus: "bound" | "unbound";
}

export interface WeComGroupDto {
  id: string;
  orgId: string;
  name: string;
  chatId?: string;
  bindCode: string;
  status: "pending_binding" | "active" | "archived";
  memberCount: number;
  lastSeenAt?: string;
  createdAt: string;
}

export interface CreateWeComGroupRequest {
  name: string;
}

export interface ImportGroupMemberByUseridRow {
  userid: string;
  name: string;
  department?: string;
}

export interface ImportGroupMembersByUseridRequest {
  rows: ImportGroupMemberByUseridRow[];
}

export interface ImportGroupMembersByUseridResult {
  groupId: string;
  created: Array<{ userid: string; name: string; memberId: string; department?: string }>;
  updated: Array<{ userid: string; name: string; memberId: string; department?: string }>;
  skipped: Array<{ rowNumber: number; reason: string }>;
}

export interface MemberCheckinHistoryDto {
  member: MemberDto;
  checkins: AdminCheckinDto[];
}

export interface GroupMissingCheckinReminderResult {
  activityId: string;
  date: string;
  missingCount: number;
  mode: "intelligent_bot";
  ok: boolean;
  message: string;
}

export interface BindWeComUseridRequest {
  wecomUserid: string;
}

export interface WeComBotEventRequest {
  messageId: string;
  fromUserId: string;
  text: string;
  botId?: string;
  botRole?: WeComBotRole;
  messageType?: "text" | "image" | "mixed";
  attachments?: WeComBotAttachment[];
  chatId?: string;
}

export type WeComBotRole = "checkin" | "coach";

export interface WeComBotAttachment {
  kind: "image";
  mediaId?: string;
  fileId?: string;
  url?: string;
  filename?: string;
  mimeType?: "image/jpeg" | "image/png" | "image/webp" | string;
  base64Data?: string;
  sizeBytes?: number;
}

export interface AiImageCheckinParseInput {
  textHint?: string;
  attachments: WeComBotAttachment[];
}

export interface WeComBotEventResponse {
  replyType: "markdown" | "text";
  text: string;
  intent: BotIntent;
  checkinId?: string;
}

export interface CoachAdviceRequest {
  question: string;
}

export interface CoachAdviceResponse {
  riskLevel: "normal" | "escalate";
  answer: string;
  model: string;
  source: "model" | "safety_template" | "unconfigured" | "model_error";
}
