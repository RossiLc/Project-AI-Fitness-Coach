import { Injectable } from "@nestjs/common";

export interface WeComRuntimeConfig {
  intelligentBotId: string;
  checkinBotId: string;
  checkinBotSecret: string;
  coachBotId: string;
  coachBotSecret: string;
  intelligentBotWsUrl: string;
  corpId: string;
  agentId: string;
  appSecret: string;
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
      corpId: process.env.WECOM_CORP_ID ?? "",
      agentId: process.env.WECOM_AGENT_ID ?? "",
      appSecret: process.env.WECOM_APP_SECRET ?? ""
    };
  }
}
