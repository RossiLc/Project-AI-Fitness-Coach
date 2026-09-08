import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import { WSClient, generateReqId, type ImageMessage, type MixedMessage, type TextMessage, type WSClientOptions, type WsFrame } from "@wecom/aibot-node-sdk";
import type { WeComBotAttachment, WeComBotEventRequest, WeComBotQuote, WeComBotRole, WeComSendResult } from "@openfit/shared";
import { ApiErrorCode } from "@openfit/shared";
import { ApiException } from "../common/api-response.js";
import { WeComBotService } from "./wecom-bot.service.js";
import { WeComConfigService } from "./wecom-config.service.js";

export interface WeComStreamBotClient {
  on(event: "message.text" | "message.image" | "message.mixed" | "error" | "authenticated" | "disconnected", handler: (...args: unknown[]) => void): unknown;
  connect(): unknown;
  disconnect(): unknown;
  replyStream(frame: unknown, streamId: string, content: string, finish?: boolean): Promise<unknown>;
  sendMessage(chatId: string, body: { msgtype: "markdown"; markdown: { content: string } }): Promise<unknown>;
  downloadFile(url: string, aesKey?: string): Promise<{ buffer: Buffer; filename?: string }>;
}

export type WeComStreamBotClientFactory = (options: WSClientOptions) => WeComStreamBotClient;

export const WECOM_STREAM_BOT_CLIENT_FACTORY = Symbol("WECOM_STREAM_BOT_CLIENT_FACTORY");

interface StreamBotRegistration {
  role: WeComBotRole;
  botId: string;
  secret: string;
}

@Injectable()
export class WeComStreamBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeComStreamBotService.name);
  private readonly clientsByRole = new Map<WeComBotRole, WeComStreamBotClient>();
  private readonly registrationsByRole = new Map<WeComBotRole, StreamBotRegistration>();
  private readonly reconnectTimers = new Map<WeComBotRole, ReturnType<typeof setTimeout>>();
  private readonly reconnectingRoles = new Set<WeComBotRole>();

  constructor(
    @Inject(WeComConfigService) private readonly config: WeComConfigService,
    @Inject(WeComBotService) private readonly bot: WeComBotService,
    @Optional()
    @Inject(WECOM_STREAM_BOT_CLIENT_FACTORY)
    private readonly clientFactory: WeComStreamBotClientFactory = (options) => new WSClient(options)
  ) {}

  async onModuleInit(): Promise<void> {
    const config = this.config.getConfig();
    if (process.env.NODE_ENV === "test") return;

    for (const registration of this.getRegistrations()) {
      this.registrationsByRole.set(registration.role, registration);
      this.createAndConnectClient(registration, config.intelligentBotWsUrl);
    }
  }

  onModuleDestroy(): void {
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    for (const client of this.clientsByRole.values()) {
      client.disconnect();
    }
    this.reconnectTimers.clear();
    this.reconnectingRoles.clear();
    this.registrationsByRole.clear();
    this.clientsByRole.clear();
  }

  async sendMarkdown(role: WeComBotRole, chatId: string, text: string): Promise<WeComSendResult> {
    const client = this.clientsByRole.get(role);
    if (!client) {
      throw new ApiException(ApiErrorCode.WeComWebhookNotConfigured, `企业微信智能机器人 ${role} 长连接尚未建立`);
    }
    if (this.reconnectingRoles.has(role)) {
      throw new ApiException(ApiErrorCode.WeComSendFailed, `企业微信智能机器人 ${role} 长连接正在自动重连，请稍后重试`);
    }

    try {
      await client.sendMessage(chatId, {
        msgtype: "markdown",
        markdown: { content: text }
      });
    } catch (error) {
      if (this.isSocketNotConnectedError(error)) {
        this.scheduleAppReconnect(role, error);
      }
      throw error;
    }

    return {
      mode: "intelligent_bot",
      ok: true,
      message: "企业微信智能机器人群消息已发送"
    };
  }

  private getRegistrations(): StreamBotRegistration[] {
    const config = this.config.getConfig();
    const registrations: StreamBotRegistration[] = [];
    if (config.checkinBotId && config.checkinBotSecret) {
      registrations.push({ role: "checkin", botId: config.checkinBotId, secret: config.checkinBotSecret });
    }
    if (config.coachBotId && config.coachBotSecret) {
      registrations.push({ role: "coach", botId: config.coachBotId, secret: config.coachBotSecret });
    }
    if (registrations.length === 0 && config.intelligentBotId && config.coachBotSecret) {
      registrations.push({ role: "coach", botId: config.intelligentBotId, secret: config.coachBotSecret });
    }
    return registrations;
  }

  private createAndConnectClient(registration: StreamBotRegistration, wsUrl: string): WeComStreamBotClient {
    const client = this.clientFactory({
      botId: registration.botId,
      secret: registration.secret,
      wsUrl: wsUrl || undefined,
      logger: this.createSdkLogger(registration.role)
    });
    this.bindClient(client, registration.role);
    this.clientsByRole.set(registration.role, client);
    client.connect();
    return client;
  }

  private bindClient(client: WeComStreamBotClient, role: WeComBotRole): void {
    client.on("authenticated", () => {
      this.reconnectingRoles.delete(role);
      this.logger.log(`企业微信智能机器人长连接认证成功：${role}`);
    });
    client.on("disconnected", (reason: unknown) => this.logger.warn(`企业微信智能机器人长连接断开：${role} ${String(reason)}`));
    client.on("error", (error: unknown) => {
      this.logger.error(`企业微信智能机器人长连接错误：${role}`, error instanceof Error ? error.stack : String(error));
      if (this.isReconnectExhaustedError(error)) {
        this.scheduleAppReconnect(role, error);
      }
    });
    client.on("message.text", (frame: unknown) => this.handleFrameSafely(client, frame as WsFrame<TextMessage>, role, "text"));
    client.on("message.image", (frame: unknown) => this.handleFrameSafely(client, frame as WsFrame<ImageMessage>, role, "image"));
    client.on("message.mixed", (frame: unknown) => this.handleFrameSafely(client, frame as WsFrame<MixedMessage>, role, "mixed"));
  }

  private scheduleAppReconnect(role: WeComBotRole, cause: unknown): void {
    if (this.reconnectTimers.has(role)) return;
    const registration = this.registrationsByRole.get(role);
    if (!registration) return;

    const delayMs = this.config.getConfig().streamAppReconnectDelayMs;
    this.reconnectingRoles.add(role);
    this.logger.warn(`企业微信智能机器人 ${role} SDK 重连耗尽或连接不可用，应用层将在 ${delayMs}ms 后重建长连接：${cause instanceof Error ? cause.message : String(cause)}`);

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(role);
      const oldClient = this.clientsByRole.get(role);
      try {
        oldClient?.disconnect();
      } catch (error) {
        this.logger.warn(`企业微信智能机器人 ${role} 旧长连接断开失败：${error instanceof Error ? error.message : String(error)}`);
      }

      try {
        this.createAndConnectClient(registration, this.config.getConfig().intelligentBotWsUrl);
        this.reconnectingRoles.delete(role);
      } catch (error) {
        this.logger.error(`企业微信智能机器人 ${role} 应用层重建长连接失败`, error instanceof Error ? error.stack : String(error));
        this.scheduleAppReconnect(role, error);
      }
    }, delayMs);
    this.reconnectTimers.set(role, timer);
  }

  private isReconnectExhaustedError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return error.name === "WSReconnectExhaustedError" || error.message.includes("Max reconnect attempts");
  }

  private isSocketNotConnectedError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return error.message.includes("WebSocket not connected") || error.message.includes("unable to send data");
  }

  private async handleFrameSafely(client: WeComStreamBotClient, frame: WsFrame<TextMessage | ImageMessage | MixedMessage>, role: WeComBotRole, messageType: "text" | "image" | "mixed"): Promise<void> {
    try {
      await this.handleFrame(client, frame, role, messageType);
    } catch (error) {
      this.logger.error(`企业微信智能机器人消息处理失败：${error instanceof Error ? error.stack : String(error)}`);
    }
  }

  private async handleFrame(client: WeComStreamBotClient, frame: WsFrame<TextMessage | ImageMessage | MixedMessage>, role: WeComBotRole, messageType: "text" | "image" | "mixed"): Promise<void> {
    const event = await this.toEventRequest(client, frame, role, messageType);
    const response = await this.bot.handleEvent(event);
    await client.replyStream(frame, generateReqId("openfit"), response.text, true);
  }

  private async toEventRequest(client: WeComStreamBotClient, frame: WsFrame<TextMessage | ImageMessage | MixedMessage>, role: WeComBotRole, messageType: "text" | "image" | "mixed"): Promise<WeComBotEventRequest> {
    const body = frame.body;
    return {
      messageId: body?.msgid ?? frame.headers?.req_id ?? generateReqId("openfit-msg"),
      fromUserId: body?.from?.userid ?? "",
      text: this.extractText(frame, messageType),
      botId: body?.aibotid,
      botRole: role,
      messageType,
      attachments: await this.extractAttachments(client, frame, messageType),
      quote: await this.extractQuote(client, frame),
      chatId: body?.chatid
    };
  }

  private extractText(frame: WsFrame<TextMessage | ImageMessage | MixedMessage>, messageType: "text" | "image" | "mixed"): string {
    if (messageType === "text") return (frame.body as TextMessage | undefined)?.text?.content ?? "";
    if (messageType === "mixed") {
      return (
        (frame.body as MixedMessage | undefined)?.mixed?.msg_item
          ?.filter((item) => item.msgtype === "text")
          .map((item) => item.text?.content ?? "")
          .join("\n") ?? ""
      ).trim();
    }
    return "";
  }

  private async extractAttachments(client: WeComStreamBotClient, frame: WsFrame<TextMessage | ImageMessage | MixedMessage>, messageType: "text" | "image" | "mixed"): Promise<WeComBotAttachment[]> {
    if (messageType === "image") {
      const image = (frame.body as ImageMessage | undefined)?.image;
      return image ? [await this.toImageAttachment(client, image)] : [];
    }
    if (messageType === "mixed") {
      const images = (frame.body as MixedMessage | undefined)?.mixed?.msg_item?.filter((item) => item.msgtype === "image" && item.image).map((item) => item.image!) ?? [];
      return Promise.all(images.map((image) => this.toImageAttachment(client, image)));
    }
    return [];
  }

  private async extractQuote(client: WeComStreamBotClient, frame: WsFrame<TextMessage | ImageMessage | MixedMessage>): Promise<WeComBotQuote | undefined> {
    const quote = frame.body?.quote;
    if (!quote) return undefined;

    if (quote.msgtype === "text") {
      return { messageType: "text", text: quote.text?.content?.trim() || undefined, attachments: [] };
    }

    if (quote.msgtype === "mixed") {
      const items = quote.mixed?.msg_item ?? [];
      const text = items
        .filter((item) => item.msgtype === "text")
        .map((item) => item.text?.content ?? "")
        .join("\n")
        .trim();
      const images = items.filter((item) => item.msgtype === "image" && item.image).map((item) => item.image!);
      return {
        messageType: "mixed",
        text: text || undefined,
        attachments: await Promise.all(images.map((image) => this.toImageAttachment(client, image)))
      };
    }

    if (quote.msgtype === "voice") {
      return { messageType: "voice", text: quote.voice?.content?.trim() || undefined, attachments: [] };
    }

    if (quote.msgtype === "image" && quote.image) {
      return { messageType: "image", attachments: [await this.toImageAttachment(client, quote.image)] };
    }

    return { messageType: quote.msgtype, attachments: [] };
  }

  private async toImageAttachment(client: WeComStreamBotClient, image: { url: string; aeskey?: string; filename?: string }): Promise<WeComBotAttachment> {
    const downloaded = await this.downloadImage(client, image);
    return {
      kind: "image",
      url: image.url,
      fileId: image.aeskey,
      filename: downloaded?.filename ?? image.filename,
      mimeType: "image/jpeg",
      base64Data: downloaded?.buffer.toString("base64"),
      sizeBytes: downloaded?.buffer.byteLength
    };
  }

  private async downloadImage(client: WeComStreamBotClient, image: { url: string; aeskey?: string; filename?: string }): Promise<{ buffer: Buffer; filename?: string } | null> {
    try {
      return await client.downloadFile(image.url, image.aeskey);
    } catch (error) {
      this.logger.warn(`企业微信图片下载解密失败：${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private createSdkLogger(role: WeComBotRole) {
    return {
      debug: (message: string, ...args: unknown[]) => this.logger.debug(`[${role}] ${message} ${args.map(String).join(" ")}`),
      info: (message: string, ...args: unknown[]) => this.logger.log(`[${role}] ${message} ${args.map(String).join(" ")}`),
      warn: (message: string, ...args: unknown[]) => this.logger.warn(`[${role}] ${message} ${args.map(String).join(" ")}`),
      error: (message: string, ...args: unknown[]) => this.logger.error(`[${role}] ${message} ${args.map(String).join(" ")}`)
    };
  }
}
