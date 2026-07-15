import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import { WSClient, generateReqId, type ImageMessage, type MixedMessage, type TextMessage, type WSClientOptions, type WsFrame } from "@wecom/aibot-node-sdk";
import type { WeComBotAttachment, WeComBotEventRequest, WeComBotRole } from "@openfit/shared";
import { WeComBotService } from "./wecom-bot.service.js";
import { WeComConfigService } from "./wecom-config.service.js";

export interface WeComStreamBotClient {
  on(event: "message.text" | "message.image" | "message.mixed" | "error" | "authenticated" | "disconnected", handler: (...args: unknown[]) => void): unknown;
  connect(): unknown;
  disconnect(): unknown;
  replyStream(frame: unknown, streamId: string, content: string, finish?: boolean): Promise<unknown>;
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
  private readonly clients: WeComStreamBotClient[] = [];

  constructor(
    @Inject(WeComConfigService) private readonly config: WeComConfigService,
    @Inject(WeComBotService) private readonly bot: WeComBotService,
    @Optional()
    @Inject(WECOM_STREAM_BOT_CLIENT_FACTORY)
    private readonly clientFactory: WeComStreamBotClientFactory = (options) => new WSClient(options)
  ) {}

  async onModuleInit(): Promise<void> {
    const config = this.config.getConfig();
    if (process.env.NODE_ENV === "test" || config.mockMode) return;

    for (const registration of this.getRegistrations()) {
      const client = this.clientFactory({
        botId: registration.botId,
        secret: registration.secret,
        wsUrl: config.intelligentBotWsUrl || undefined,
        logger: this.createSdkLogger(registration.role)
      });
      this.bindClient(client, registration.role);
      client.connect();
      this.clients.push(client);
    }
  }

  onModuleDestroy(): void {
    for (const client of this.clients) {
      client.disconnect();
    }
    this.clients.length = 0;
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

  private bindClient(client: WeComStreamBotClient, role: WeComBotRole): void {
    client.on("authenticated", () => this.logger.log(`企业微信智能机器人长连接认证成功：${role}`) as never);
    client.on("disconnected", (reason: unknown) => this.logger.warn(`企业微信智能机器人长连接断开：${role} ${String(reason)}`));
    client.on("error", (error: unknown) => this.logger.error(`企业微信智能机器人长连接错误：${role}`, error instanceof Error ? error.stack : String(error)));
    client.on("message.text", (frame: unknown) => this.handleFrameSafely(client, frame as WsFrame<TextMessage>, role, "text"));
    client.on("message.image", (frame: unknown) => this.handleFrameSafely(client, frame as WsFrame<ImageMessage>, role, "image"));
    client.on("message.mixed", (frame: unknown) => this.handleFrameSafely(client, frame as WsFrame<MixedMessage>, role, "mixed"));
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
