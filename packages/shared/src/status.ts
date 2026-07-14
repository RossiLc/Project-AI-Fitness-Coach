export enum CheckinStatus {
  Draft = "draft",
  Recognized = "recognized",
  Submitted = "submitted",
  Corrected = "corrected",
  Withdrawn = "withdrawn",
  Invalid = "invalid"
}

export enum RecognitionStatus {
  Pending = "pending",
  Succeeded = "succeeded",
  Failed = "failed",
  Confirmed = "confirmed",
  Discarded = "discarded"
}

export enum ReminderStatus {
  Pending = "pending",
  Eligible = "eligible",
  Sent = "sent",
  Skipped = "skipped",
  Failed = "failed",
  Manual = "manual"
}

export enum ActivityStatus {
  Draft = "draft",
  Active = "active",
  Paused = "paused",
  Ended = "ended"
}

export enum MemberRole {
  Employee = "employee",
  ActivityAdmin = "activity_admin",
  OrgAdmin = "org_admin"
}

export enum BotIntent {
  CheckinRecord = "checkin_record",
  CheckinConfirm = "checkin_confirm",
  CoachAdvice = "coach_advice",
  ActivityQuery = "activity_query",
  LeaderboardQuery = "leaderboard_query",
  Unknown = "unknown"
}
