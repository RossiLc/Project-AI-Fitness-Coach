import { Inject, Injectable } from "@nestjs/common";
import { ApiErrorCode, type WeComBotRole, type WeComSendResult } from "@openfit/shared";
import { ApiException } from "../common/api-response.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { WeComStreamBotService } from "./wecom-stream-bot.service.js";

@Injectable()
export class WeComMessageSender {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WeComStreamBotService) private readonly streamBot: WeComStreamBotService
  ) {}

  async sendMarkdown(text: string): Promise<WeComSendResult> {
    const chat = await this.prisma.weComGroup.findFirst({
      where: { status: "active", chatId: { not: null } },
      orderBy: { lastSeenAt: "desc" }
    });

    if (!chat) {
      throw new ApiException(ApiErrorCode.WeComWebhookNotConfigured, "尚未捕获企业微信群会话，请先在目标群里 @Open Fit 打卡助手发送任意消息后再重试");
    }

    return this.streamBot.sendMarkdown(resolveOutboundBotRole(chat.botRole), chat.chatId!, text);
  }

  async sendMarkdownToChat(chatId: string, text: string): Promise<WeComSendResult> {
    if (!chatId.trim()) {
      throw new ApiException(ApiErrorCode.WeComWebhookNotConfigured, "企业微信群尚未完成绑定，请先在目标群里 @Open Fit 打卡助手发送绑定口令");
    }
    const chat = await this.prisma.weComGroup.findFirst({ where: { chatId, status: "active" } });
    return this.streamBot.sendMarkdown(resolveOutboundBotRole(chat?.botRole), chatId, text);
  }

  async sendMarkdownToUser(userid: string, text: string): Promise<WeComSendResult> {
    const target = userid.trim();
    if (!target) {
      throw new ApiException(ApiErrorCode.WeComSendFailed, "企业微信 userid 不能为空");
    }
    if (!text.trim()) {
      throw new ApiException(ApiErrorCode.WeComSendFailed, "单聊推送内容不能为空");
    }
    return this.streamBot.sendMarkdown("coach", target, text);
  }
}

function resolveOutboundBotRole(botRole?: string | null): WeComBotRole {
  if (botRole === "coach") return "coach";
  const hasCheckinBot = Boolean(process.env.WECOM_CHECKIN_BOT_ID?.trim() && process.env.WECOM_CHECKIN_BOT_SECRET?.trim());
  const hasCoachBot = Boolean(process.env.WECOM_COACH_BOT_ID?.trim() && process.env.WECOM_COACH_BOT_SECRET?.trim());
  if (!hasCheckinBot && hasCoachBot) return "coach";
  return "checkin";
}
