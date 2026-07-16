import { Inject, Injectable } from "@nestjs/common";
import { ApiErrorCode, type WeComSendResult } from "@openfit/shared";
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

    return this.streamBot.sendMarkdown("checkin", chat.chatId!, text);
  }

  async sendMarkdownToChat(chatId: string, text: string): Promise<WeComSendResult> {
    if (!chatId.trim()) {
      throw new ApiException(ApiErrorCode.WeComWebhookNotConfigured, "企业微信群尚未完成绑定，请先在目标群里 @Open Fit 打卡助手发送绑定口令");
    }
    return this.streamBot.sendMarkdown("checkin", chatId, text);
  }
}
