import { beforeEach, describe, expect, it, vi } from "vitest";
import { BotIntent, type WeComBotEventResponse } from "@openfit/shared";
import { WeComStreamBotService, type WeComStreamBotClient, type WeComStreamBotClientFactory } from "./wecom-stream-bot.service.js";
import { WeComConfigService } from "./wecom-config.service.js";

class FakeWeComBotService {
  public readonly events: unknown[] = [];

  async handleEvent(event: unknown): Promise<WeComBotEventResponse> {
    this.events.push(event);
    return {
      replyType: "markdown",
      intent: BotIntent.CheckinRecord,
      text: "打卡成功。"
    };
  }
}

function createClient() {
  const handlers = new Map<string, (frame: unknown) => Promise<void> | void>();
  return {
    handlers,
    client: {
      on: vi.fn((event: string, handler: (frame: unknown) => Promise<void> | void) => {
        handlers.set(event, handler);
        return undefined;
      }),
      connect: vi.fn(),
      disconnect: vi.fn(),
      replyStream: vi.fn(),
      sendMessage: vi.fn(),
      downloadFile: vi.fn(async () => ({ buffer: Buffer.from("wecom-image"), filename: "downloaded.jpg" }))
    } satisfies WeComStreamBotClient
  };
}

describe("WeComStreamBotService", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("stream 模式下为打卡助手和 AI 教练分别建立长连接", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WECOM_CHECKIN_BOT_ID", "checkin-bot");
    vi.stubEnv("WECOM_CHECKIN_BOT_SECRET", "checkin-secret");
    vi.stubEnv("WECOM_COACH_BOT_ID", "coach-bot");
    vi.stubEnv("WECOM_COACH_BOT_SECRET", "coach-secret");
    const first = createClient();
    const second = createClient();
    const factory: WeComStreamBotClientFactory = vi.fn((options) => (options.botId === "checkin-bot" ? first.client : second.client));

    const service = new WeComStreamBotService(new WeComConfigService(), new FakeWeComBotService() as never, factory);

    await service.onModuleInit();

    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ botId: "checkin-bot", secret: "checkin-secret" }));
    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ botId: "coach-bot", secret: "coach-secret" }));
    expect(first.client.connect).toHaveBeenCalledOnce();
    expect(second.client.connect).toHaveBeenCalledOnce();
  });

  it("将 SDK 文本消息归一化后交给现有机器人业务服务处理并回复", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WECOM_CHECKIN_BOT_ID", "checkin-bot");
    vi.stubEnv("WECOM_CHECKIN_BOT_SECRET", "checkin-secret");
    const fakeBot = new FakeWeComBotService();
    const { client, handlers } = createClient();
    const service = new WeComStreamBotService(new WeComConfigService(), fakeBot as never, () => client);
    await service.onModuleInit();

    await handlers.get("message.text")?.({
      headers: { req_id: "req-1" },
      body: {
        msgid: "msg-1",
        aibotid: "checkin-bot",
        chatid: "chat-1",
        from: { userid: "wecom-user-1" },
        text: { content: "打卡 跑步30分钟" }
      }
    });

    expect(fakeBot.events[0]).toMatchObject({
      messageId: "msg-1",
      fromUserId: "wecom-user-1",
      text: "打卡 跑步30分钟",
      botId: "checkin-bot",
      botRole: "checkin",
      messageType: "text",
      chatId: "chat-1"
    });
    expect(client.replyStream).toHaveBeenCalledWith(expect.anything(), expect.stringMatching(/^openfit[_-]/), "打卡成功。", true);
  });

  it("将 SDK 图片消息归一化为图片附件", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WECOM_CHECKIN_BOT_ID", "checkin-bot");
    vi.stubEnv("WECOM_CHECKIN_BOT_SECRET", "checkin-secret");
    const fakeBot = new FakeWeComBotService();
    const { client, handlers } = createClient();
    const service = new WeComStreamBotService(new WeComConfigService(), fakeBot as never, () => client);
    await service.onModuleInit();

    await handlers.get("message.image")?.({
      body: {
        msgid: "msg-image-1",
        aibotid: "checkin-bot",
        from: { userid: "wecom-user-1" },
        image: { url: "https://example.test/image", aeskey: "aes-key", filename: "photo.jpg" }
      }
    });

    expect(fakeBot.events[0]).toMatchObject({
      messageId: "msg-image-1",
      messageType: "image",
      attachments: [
        {
          kind: "image",
          url: "https://example.test/image",
          fileId: "aes-key",
          filename: "downloaded.jpg",
          base64Data: Buffer.from("wecom-image").toString("base64"),
          sizeBytes: Buffer.byteLength("wecom-image")
        }
      ]
    });
    expect(client.downloadFile).toHaveBeenCalledWith("https://example.test/image", "aes-key");
  });

  it("test 或 mock 模式不会建立长连接", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("WECOM_CHECKIN_BOT_ID", "checkin-bot");
    vi.stubEnv("WECOM_CHECKIN_BOT_SECRET", "checkin-secret");
    const factory: WeComStreamBotClientFactory = vi.fn(() => createClient().client);

    await new WeComStreamBotService(new WeComConfigService(), new FakeWeComBotService() as never, factory).onModuleInit();

    expect(factory).not.toHaveBeenCalled();
  });

  it("through checkin bot long connection sends proactive markdown to a known group chat", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WECOM_CHECKIN_BOT_ID", "checkin-bot");
    vi.stubEnv("WECOM_CHECKIN_BOT_SECRET", "checkin-secret");
    const { client } = createClient();
    const service = new WeComStreamBotService(new WeComConfigService(), new FakeWeComBotService() as never, () => client);
    await service.onModuleInit();

    const result = await service.sendMarkdown("checkin", "chat-1", "Open Fit reminder");

    expect(client.sendMessage).toHaveBeenCalledWith("chat-1", {
      msgtype: "markdown",
      markdown: { content: "Open Fit reminder" }
    });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe("intelligent_bot");
  });
});
