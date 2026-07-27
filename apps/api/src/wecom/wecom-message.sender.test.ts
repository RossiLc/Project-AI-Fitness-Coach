import { afterEach, describe, expect, it, vi } from "vitest";
import { WeComMessageSender } from "./wecom-message.sender.js";

function createPrisma(chatId?: string, botRole = "checkin") {
  return {
    weComGroup: {
      findFirst: vi.fn(async () => (chatId ? { chatId, botRole } : null))
    }
  };
}

describe("WeComMessageSender", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends group markdown through checkin intelligent bot long connection", async () => {
    const prisma = createPrisma("group-chat-1");
    const streamBot = {
      sendMarkdown: vi.fn(async () => ({
        mode: "intelligent_bot" as const,
        ok: true,
        message: "sent"
      }))
    };
    const sender = new WeComMessageSender(prisma as never, streamBot as never);

    const result = await sender.sendMarkdown("Open Fit reminder");

    expect(prisma.weComGroup.findFirst).toHaveBeenCalledWith({
      where: { status: "active", chatId: { not: null } },
      orderBy: { lastSeenAt: "desc" }
    });
    expect(streamBot.sendMarkdown).toHaveBeenCalledWith("checkin", "group-chat-1", "Open Fit reminder");
    expect(result.mode).toBe("intelligent_bot");
  });

  it("sends group markdown through the bot role captured during group binding", async () => {
    const prisma = createPrisma("coach-chat-1", "coach");
    const streamBot = {
      sendMarkdown: vi.fn(async () => ({
        mode: "intelligent_bot" as const,
        ok: true,
        message: "sent"
      }))
    };
    const sender = new WeComMessageSender(prisma as never, streamBot as never);

    await sender.sendMarkdown("Open Fit push");

    expect(streamBot.sendMarkdown).toHaveBeenCalledWith("coach", "coach-chat-1", "Open Fit push");
  });

  it("fails clearly when no group chat has been captured", async () => {
    const sender = new WeComMessageSender(createPrisma() as never, { sendMarkdown: vi.fn() } as never);

    await expect(sender.sendMarkdown("Open Fit reminder")).rejects.toMatchObject({
      code: "WECOM_WEBHOOK_NOT_CONFIGURED"
    });
  });

  it("sends group markdown to an explicit selected group chat", async () => {
    const streamBot = {
      sendMarkdown: vi.fn(async () => ({
        mode: "intelligent_bot" as const,
        ok: true,
        message: "sent"
      }))
    };
    const sender = new WeComMessageSender(createPrisma() as never, streamBot as never);

    const result = await sender.sendMarkdownToChat("selected-chat", "Open Fit reminder");

    expect(streamBot.sendMarkdown).toHaveBeenCalledWith("checkin", "selected-chat", "Open Fit reminder");
    expect(result.ok).toBe(true);
  });

  it("sends explicit group markdown through coach when selected group was bound by AI coach", async () => {
    const streamBot = {
      sendMarkdown: vi.fn(async () => ({
        mode: "intelligent_bot" as const,
        ok: true,
        message: "sent"
      }))
    };
    const prisma = {
      weComGroup: {
        findFirst: vi.fn(async () => ({ chatId: "selected-chat", botRole: "coach" }))
      }
    };
    const sender = new WeComMessageSender(prisma as never, streamBot as never);

    await sender.sendMarkdownToChat("selected-chat", "Open Fit reminder");

    expect(streamBot.sendMarkdown).toHaveBeenCalledWith("coach", "selected-chat", "Open Fit reminder");
  });

  it("falls back to coach when selected group has legacy checkin role but only AI coach is configured", async () => {
    vi.stubEnv("WECOM_CHECKIN_BOT_ID", "");
    vi.stubEnv("WECOM_CHECKIN_BOT_SECRET", "");
    vi.stubEnv("WECOM_COACH_BOT_ID", "coach-bot");
    vi.stubEnv("WECOM_COACH_BOT_SECRET", "coach-secret");
    const streamBot = {
      sendMarkdown: vi.fn(async () => ({
        mode: "intelligent_bot" as const,
        ok: true,
        message: "sent"
      }))
    };
    const prisma = {
      weComGroup: {
        findFirst: vi.fn(async () => ({ chatId: "selected-chat", botRole: "checkin" }))
      }
    };
    const sender = new WeComMessageSender(prisma as never, streamBot as never);

    await sender.sendMarkdownToChat("selected-chat", "Open Fit reminder");

    expect(streamBot.sendMarkdown).toHaveBeenCalledWith("coach", "selected-chat", "Open Fit reminder");
  });
});
