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
    client.on("message.text", (frame: unknown) => {
      void this.handleFrame(client, frame as WsFrame<TextMessage>, role, "text");
    });
    client.on("message.image", (frame: unknown) => {
      void this.handleFrame(client, frame as WsFrame<ImageMessage>, role, "image");
    });
    client.on("message.mixed", (frame: unknown) => {
      void this.handleFrame(client, frame as WsFrame<MixedMessage>, role, "mixed");
    });
  }

  private async handleFrame(client: WeComStreamBotClient, frame: WsFrame<TextMessage | ImageMessage | MixedMessage>, role: WeComBotRole, messageType: "text" | "image" | "mixed"): Promise<void> {
    const event = this.toEventRequest(frame, role, messageType);
    const response = await this.bot.handleEvent(event);
    await client.replyStream(frame, generateReqId("openfit"), response.text, true);
  }

  private toEventRequest(frame: WsFrame<TextMessage | ImageMessage | MixedMessage>, role: WeComBotRole, messageType: "text" | "image" | "mixed"): WeComBotEventRequest {
    const body = frame.body;
    return {
      messageId: body?.msgid ?? frame.headers?.req_id ?? generateReqId("openfit-msg"),
      fromUserId: body?.from?.userid ?? "",
      text: this.extractText(frame, messageType),
      botId: body?.aibotid,
      botRole: role,
      messageType,
      attachments: this.extractAttachments(frame, messageType),
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

  private extractAttachments(frame: WsFrame<TextMessage | ImageMessage | MixedMessage>, messageType: "text" | "image" | "mixed"): WeComBotAttachment[] {
    if (messageType === "image") {
      const image = (frame.body as ImageMessage | undefined)?.image;
      return image ? [this.toImageAttachment(image)] : [];
    }
    if (messageType === "mixed") {
      return (
        (frame.body as MixedMessage | undefined)?.mixed?.msg_item
          ?.filter((item) => item.msgtype === "image" && item.image)
          .map((item) => this.toImageAttachment(item.image!)) ?? []
      );
    }
    return [];
  }

  private toImageAttachment(image: { url: string; aeskey?: string; filename?: string }): WeComBotAttachment {
    return {
      kind: "image",
      url: image.url,
      fileId: image.aeskey,
      filename: image.filename,
      mimeType: "image/jpeg"
    };
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
