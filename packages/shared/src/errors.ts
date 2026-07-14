export enum ApiErrorCode {
  ActivityNotActive = "ACTIVITY_NOT_ACTIVE",
  CheckinAlreadySubmitted = "CHECKIN_ALREADY_SUBMITTED",
  CheckinNotFound = "CHECKIN_NOT_FOUND",
  UnauthorizedRole = "UNAUTHORIZED_ROLE",
  WeComWebhookNotConfigured = "WECOM_WEBHOOK_NOT_CONFIGURED",
  WeComSendFailed = "WECOM_SEND_FAILED"
}

export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode | string;
    message: string;
    detail?: unknown;
  };
}
