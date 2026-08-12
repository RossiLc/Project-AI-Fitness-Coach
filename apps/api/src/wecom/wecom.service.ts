import { Inject, Injectable } from "@nestjs/common";
import type { CurrentUser, WeComDirectMessageRequest, WeComTestMessageRequest } from "@openfit/shared";
import { Prisma } from "@prisma/client";
import { LeaderboardsService } from "../leaderboards/leaderboards.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { WeComMessageSender } from "./wecom-message.sender.js";

@Injectable()
export class WeComService {
  constructor(
    @Inject(WeComMessageSender) private readonly sender: WeComMessageSender,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LeaderboardsService) private readonly leaderboards: LeaderboardsService
  ) {}

  async sendTestMessage(user: CurrentUser, body: WeComTestMessageRequest) {
    const result = await this.sender.sendMarkdown(body.previewText || "Open Fit 企业微信测试消息");
    await this.recordAudit(user, "wecom.test_message", result);
    return result;
  }

  async sendDailyTip(user: CurrentUser) {
    const result = await this.sender.sendMarkdown("今日小贴士：选择 20-30 分钟低到中等强度运动，先热身，结束后补水和拉伸。");
    await this.recordAudit(user, "wecom.daily_tip", result);
    return result;
  }

  async sendWeeklyLeaderboard(user: CurrentUser) {
    const leaderboard = await this.leaderboards.current();
    const lines =
      leaderboard.entries.length > 0
        ? leaderboard.entries.slice(0, 10).map((entry) => `${entry.rank}. ${entry.memberName} 有效打卡 ${entry.checkinDays} 天，累计 ${entry.durationMin} 分钟`)
        : ["暂无有效打卡数据"];
    const result = await this.sender.sendMarkdown(`本周运动榜：\n${lines.join("\n")}\n榜单仅展示活动统计所需信息。`);
    await this.recordAudit(user, "wecom.weekly_leaderboard", result);
    return result;
  }

  async sendDirectMessage(user: CurrentUser, body: WeComDirectMessageRequest) {
    const result = await this.sender.sendMarkdownToUser(body.targetUserid, body.content);
    await this.recordAudit(user, "wecom.direct_message", {
      targetUserid: body.targetUserid,
      result
    });
    return result;
  }

  private async recordAudit(user: CurrentUser, action: string, result: unknown) {
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action,
        targetType: "wecom_config",
        targetId: "wecom_cfg_demo",
        detailJson: result as unknown as Prisma.InputJsonValue
      }
    });
  }
}
