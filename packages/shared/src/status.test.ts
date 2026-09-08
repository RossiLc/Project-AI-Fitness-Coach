import { describe, expect, it } from "vitest";
import { BotIntent, CheckinStatus, MemberRole, ReminderStatus } from "./status.js";
import { ApiErrorCode } from "./errors.js";
import type { WeComBotEventRequest } from "./contracts.js";

describe("共享状态与错误码", () => {
  it("导出第一阶段打卡状态流", () => {
    expect(CheckinStatus.Recognized).toBe("recognized");
    expect(CheckinStatus.Submitted).toBe("submitted");
    expect(CheckinStatus.Invalid).toBe("invalid");
  });

  it("导出三类工作台角色", () => {
    expect(MemberRole.Employee).toBe("employee");
    expect(MemberRole.ActivityAdmin).toBe("activity_admin");
    expect(MemberRole.OrgAdmin).toBe("org_admin");
  });

  it("导出提醒任务状态和稳定错误码", () => {
    expect(ReminderStatus.Manual).toBe("manual");
    expect(ApiErrorCode.WeComWebhookNotConfigured).toBe("WECOM_WEBHOOK_NOT_CONFIGURED");
  });

  it("导出企业微信智能机器人意图", () => {
    expect(BotIntent.CheckinRecord).toBe("checkin_record");
    expect(BotIntent.CheckinConfirm).toBe("checkin_confirm");
    expect(BotIntent.CoachAdvice).toBe("coach_advice");
  });

  it("企业微信入站契约支持双机器人角色", () => {
    const checkinEvent: WeComBotEventRequest = {
      messageId: "msg_checkin",
      fromUserId: "wecom_user_001",
      text: "打卡 跑步30分钟",
      botRole: "checkin"
    };
    const coachEvent: WeComBotEventRequest = {
      messageId: "msg_coach",
      fromUserId: "wecom_user_001",
      text: "活动规则是什么",
      botId: "coach_bot_id",
      botRole: "coach",
      quote: {
        messageType: "text",
        text: "我昨天快走 30 分钟",
        attachments: []
      }
    };

    expect(checkinEvent.botRole).toBe("checkin");
    expect(coachEvent.botRole).toBe("coach");
    expect(coachEvent.quote?.text).toContain("快走");
  });
});
