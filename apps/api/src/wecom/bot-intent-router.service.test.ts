import { describe, expect, it } from "vitest";
import { BotIntent } from "@openfit/shared";
import { BotIntentRouterService } from "./bot-intent-router.service.js";

describe("BotIntentRouterService", () => {
  const router = new BotIntentRouterService();

  it("识别确认提交意图", () => {
    expect(router.detect("确认")).toBe(BotIntent.CheckinConfirm);
    expect(router.detect("提交刚才的打卡")).toBe(BotIntent.CheckinConfirm);
  });

  it("识别运动打卡意图", () => {
    expect(router.detect("跑步 30 分钟")).toBe(BotIntent.CheckinRecord);
    expect(router.detect("快走40分钟 4公里")).toBe(BotIntent.CheckinRecord);
  });

  it("识别教练咨询和查询意图", () => {
    expect(router.detect("我膝盖不舒服今天怎么练")).toBe(BotIntent.CoachAdvice);
    expect(router.detect("今天活动规则是什么")).toBe(BotIntent.ActivityQuery);
    expect(router.detect("我现在排名第几")).toBe(BotIntent.LeaderboardQuery);
  });

  it("显式关键词优先于普通语义", () => {
    expect(router.detect("打卡 今天跑了30分钟")).toBe(BotIntent.CheckinRecord);
    expect(router.detect("AI教练 帮我安排拉伸")).toBe(BotIntent.CoachAdvice);
    expect(router.detect("活动信息 什么时候结束")).toBe(BotIntent.ActivityQuery);
  });

  it("低置信度语义不直接判定为业务动作", () => {
    expect(router.detect("今天练一下")).toBe(BotIntent.Unknown);
  });
});
