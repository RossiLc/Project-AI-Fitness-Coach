import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";

export type CoachConversationMessageInput = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CoachConversationContext = {
  conversationId: string | null;
  summary: string;
  messages: CoachConversationMessageInput[];
};

type ConversationKey = {
  orgId: string;
  memberId: string;
  wecomUserid: string;
  chatId?: string;
};

@Injectable()
export class CoachConversationService {
  private readonly recentMessageLimit = 10;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async buildContext(input: ConversationKey): Promise<CoachConversationContext> {
    const conversation = await this.findConversation(input);
    if (!conversation) return { conversationId: null, summary: "", messages: [] };

    const latest = await this.prisma.coachConversationMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: this.recentMessageLimit
    });

    return {
      conversationId: conversation.id,
      summary: conversation.summary ?? "",
      messages: latest
        .reverse()
        .map((message) => ({ role: message.role as "user" | "assistant", content: message.content }))
        .filter((message) => message.role === "user" || message.role === "assistant")
    };
  }

  async appendExchange(input: ConversationKey & { userText: string; assistantText: string }): Promise<void> {
    const conversation = await this.getOrCreateConversation(input);
    await this.prisma.coachConversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: input.userText,
        contentHash: this.hash(input.userText)
      }
    });
    await this.prisma.coachConversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: input.assistantText,
        contentHash: this.hash(input.assistantText)
      }
    });
    await this.compactIfNeeded(conversation.id);
    await this.prisma.coachConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
  }

  async clearConversation(input: { orgId: string; wecomUserid: string; chatId?: string }): Promise<boolean> {
    const conversation = await this.prisma.coachConversation.findFirst({
      where: { orgId: input.orgId, wecomUserid: input.wecomUserid, chatId: input.chatId ?? null }
    });
    if (!conversation) return false;
    await this.prisma.coachConversationMessage.deleteMany({ where: { conversationId: conversation.id } });
    await this.prisma.coachConversation.deleteMany({ where: { id: conversation.id } });
    return true;
  }

  private async findConversation(input: ConversationKey) {
    return this.prisma.coachConversation.findFirst({
      where: { orgId: input.orgId, wecomUserid: input.wecomUserid, chatId: input.chatId ?? null }
    });
  }

  private async getOrCreateConversation(input: ConversationKey) {
    const existing = await this.findConversation(input);
    if (existing) return existing;
    return this.prisma.coachConversation.create({
      data: {
        orgId: input.orgId,
        memberId: input.memberId,
        wecomUserid: input.wecomUserid,
        chatId: input.chatId ?? null,
        channel: "wecom",
        lastMessageAt: new Date()
      }
    });
  }

  private async compactIfNeeded(conversationId: string): Promise<void> {
    const count = await this.prisma.coachConversationMessage.count({ where: { conversationId } });
    if (count <= this.recentMessageLimit) return;

    const allMessages = await this.prisma.coachConversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" }
    });
    const overflow = allMessages.slice(0, Math.max(0, allMessages.length - this.recentMessageLimit));
    const keep = allMessages.slice(-this.recentMessageLimit);
    const summaryText = overflow.map((message) => `${message.role}:${message.content}`).join("\n");
    const existing = await this.prisma.coachConversation.findFirst({ where: { id: conversationId } });
    const summary = [existing?.summary, summaryText].filter(Boolean).join("\n").slice(-2000);
    await this.prisma.coachConversation.update({ where: { id: conversationId }, data: { summary } });
    if (keep[0]) {
      await this.prisma.coachConversationMessage.deleteMany({
        where: { conversationId, createdAt: { lt: keep[0].createdAt } }
      });
    }
  }

  private hash(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }
}
