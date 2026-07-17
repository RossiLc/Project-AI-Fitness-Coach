import { Inject, Injectable, Optional, type OnModuleInit } from "@nestjs/common";
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

type CoachConversationOptions = {
  now?: () => Date;
  conversationTtlHours?: number;
  cleanupDays?: number;
  recentMessageLimit?: number;
  summaryMaxChars?: number;
};

export const COACH_CONVERSATION_OPTIONS = Symbol("COACH_CONVERSATION_OPTIONS");

@Injectable()
export class CoachConversationService implements OnModuleInit {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(COACH_CONVERSATION_OPTIONS) private readonly options: CoachConversationOptions = {}
  ) {}

  async onModuleInit(): Promise<void> {
    await this.cleanupExpiredConversations();
  }

  async buildContext(input: ConversationKey): Promise<CoachConversationContext> {
    const conversation = await this.findConversation(input);
    if (!conversation) return { conversationId: null, summary: "", messages: [] };
    if (this.isConversationExpired(conversation.lastMessageAt)) return { conversationId: null, summary: "", messages: [] };

    const latest = await this.prisma.coachConversationMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: this.recentMessageLimit()
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
    await this.prisma.coachConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: this.now() } });
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
    if (existing && !this.isConversationExpired(existing.lastMessageAt)) return existing;
    if (existing) await this.deleteConversation(existing.id);
    return this.prisma.coachConversation.create({
      data: {
        orgId: input.orgId,
        memberId: input.memberId,
        wecomUserid: input.wecomUserid,
        chatId: input.chatId ?? null,
        channel: "wecom",
        lastMessageAt: this.now()
      }
    });
  }

  async cleanupExpiredConversations(): Promise<{ deletedConversations: number }> {
    const threshold = new Date(this.now().getTime() - this.cleanupDays() * 24 * 60 * 60 * 1000);
    const expired = await this.prisma.coachConversation.findMany({
      where: { lastMessageAt: { lt: threshold } },
      select: { id: true }
    });
    for (const conversation of expired) {
      await this.deleteConversation(conversation.id);
    }
    return { deletedConversations: expired.length };
  }

  private async compactIfNeeded(conversationId: string): Promise<void> {
    const count = await this.prisma.coachConversationMessage.count({ where: { conversationId } });
    if (count <= this.recentMessageLimit()) return;

    const allMessages = await this.prisma.coachConversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" }
    });
    const overflow = allMessages.slice(0, Math.max(0, allMessages.length - this.recentMessageLimit()));
    const keep = allMessages.slice(-this.recentMessageLimit());
    const summaryText = overflow.map((message) => `${message.role}:${message.content}`).join("\n");
    const existing = await this.prisma.coachConversation.findFirst({ where: { id: conversationId } });
    const summary = [existing?.summary, summaryText].filter(Boolean).join("\n").slice(-this.summaryMaxChars());
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

  private isConversationExpired(lastMessageAt: Date): boolean {
    return this.now().getTime() - lastMessageAt.getTime() > this.conversationTtlHours() * 60 * 60 * 1000;
  }

  private async deleteConversation(conversationId: string): Promise<void> {
    await this.prisma.coachConversationMessage.deleteMany({ where: { conversationId } });
    await this.prisma.coachConversation.deleteMany({ where: { id: conversationId } });
  }

  private recentMessageLimit(): number {
    return this.options.recentMessageLimit ?? Number(process.env.COACH_CONVERSATION_RECENT_MESSAGE_LIMIT ?? 10);
  }

  private conversationTtlHours(): number {
    return this.options.conversationTtlHours ?? Number(process.env.COACH_CONVERSATION_TTL_HOURS ?? 72);
  }

  private cleanupDays(): number {
    return this.options.cleanupDays ?? Number(process.env.COACH_CONVERSATION_CLEANUP_DAYS ?? 30);
  }

  private summaryMaxChars(): number {
    return this.options.summaryMaxChars ?? Number(process.env.COACH_CONVERSATION_SUMMARY_MAX_CHARS ?? 2000);
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }
}
