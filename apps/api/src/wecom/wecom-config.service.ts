import { Injectable } from "@nestjs/common";

export interface WeComRuntimeConfig {
  intelligentBotId: string;
  checkinBotId: string;
  checkinBotSecret: string;
  coachBotId: string;
  coachBotSecret: string;
  intelligentBotWsUrl: string;
  streamAppReconnectDelayMs: number;
}

@Injectable()
export class WeComConfigService {
  getConfig(): WeComRuntimeConfig {
    return {
      intelligentBotId: process.env.WECOM_INTELLIGENT_BOT_ID ?? "",
      checkinBotId: process.env.WECOM_CHECKIN_BOT_ID ?? "",
      checkinBotSecret: process.env.WECOM_CHECKIN_BOT_SECRET ?? "",
      coachBotId: process.env.WECOM_COACH_BOT_ID ?? "",
      coachBotSecret: process.env.WECOM_COACH_BOT_SECRET ?? "",
      intelligentBotWsUrl: process.env.WECOM_INTELLIGENT_BOT_WS_URL ?? "",
      streamAppReconnectDelayMs: this.readPositiveNumber(process.env.WECOM_STREAM_APP_RECONNECT_DELAY_MS, 60_000)
    };
  }

  private readPositiveNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
