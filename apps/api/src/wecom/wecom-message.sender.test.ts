import { describe, expect, it, vi } from "vitest";
import { WeComMessageSender } from "./wecom-message.sender.js";

function createPrisma(chatId?: string) {
  return {
    weComGroup: {
      findFirst: vi.fn(async () => (chatId ? { chatId } : null))
    }
  };
}

describe("WeComMessageSender", () => {
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
});
