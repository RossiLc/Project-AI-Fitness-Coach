import { Injectable } from "@nestjs/common";
import { BotIntent } from "@openfit/shared";

const confirmKeywords = ["确认", "提交", "确认提交"];
const explicitCheckinKeywords = ["打卡"];
const explicitCoachKeywords = ["AI教练", "ai教练", "教练"];
const activityKeywords = ["活动规则", "活动信息", "规则", "今天活动", "活动是什么"];
const leaderboardKeywords = ["排名", "排行榜", "榜单", "第几"];
const checkinKeywords = ["跑", "走", "快走", "骑", "单车", "游泳", "瑜伽", "力量", "训练", "运动"];
const coachKeywords = [
  "怎么练",
  "计划",
  "建议",
  "拉伸",
  "疼",
  "不舒服",
  "膝盖",
  "腰",
  "肩",
  "胸痛",
  "晕厥",
  "呼吸困难",
  "急性损伤",
  "术后",
  "慢性病",
  "极端减重"
];

@Injectable()
export class BotIntentRouterService {
  detect(text: string): BotIntent {
    const normalized = text.trim();
    if (!normalized) return BotIntent.Unknown;
    if (confirmKeywords.some((keyword) => normalized.includes(keyword))) return BotIntent.CheckinConfirm;
    if (explicitCoachKeywords.some((keyword) => normalized.includes(keyword))) return BotIntent.CoachAdvice;
    if (activityKeywords.some((keyword) => normalized.includes(keyword))) return BotIntent.ActivityQuery;
    if (leaderboardKeywords.some((keyword) => normalized.includes(keyword))) return BotIntent.LeaderboardQuery;
    if (explicitCheckinKeywords.some((keyword) => normalized.includes(keyword))) return BotIntent.CheckinRecord;
    if (this.hasDuration(normalized) && checkinKeywords.some((keyword) => normalized.includes(keyword))) return BotIntent.CheckinRecord;
    if (coachKeywords.some((keyword) => normalized.includes(keyword))) return BotIntent.CoachAdvice;
    return BotIntent.Unknown;
  }

  private hasDuration(text: string): boolean {
    return /\d+(?:\.\d+)?\s*(分钟|min|公里|km|千米)/i.test(text);
  }
}
