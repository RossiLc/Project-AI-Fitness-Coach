import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { BotIntent, MemberRole, type CurrentUser, type RecognitionResultDto, type WeComBotAttachment, type WeComBotEventRequest, type WeComBotEventResponse, type WeComBotRole } from "@openfit/shared";
import { AiCheckinParserService } from "../ai/ai-checkin-parser.service.js";
import { AiProviderService } from "../ai/ai-provider.service.js";
import { CheckinsService } from "../checkins/checkins.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { BotIntentRouterService } from "./bot-intent-router.service.js";
import { CoachSafetyService } from "./coach-safety.service.js";

function readActivityContent(ruleJson: unknown): string {
  if (!ruleJson || typeof ruleJson !== "object" || Array.isArray(ruleJson)) return "";
  const content = (ruleJson as Record<string, unknown>).content;
  return typeof content === "string" ? content.trim() : "";
}

@Injectable()
export class WeComBotService {
  private readonly handledMessages = new Map<string, WeComBotEventResponse>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CheckinsService) private readonly checkins: CheckinsService,
    @Inject(BotIntentRouterService) private readonly router: BotIntentRouterService,
    @Inject(CoachSafetyService) private readonly coachSafety: CoachSafetyService,
    @Inject(AiCheckinParserService) private readonly aiParser: AiCheckinParserService,
    @Inject(AiProviderService) private readonly aiProvider: AiProviderService
  ) {}

  async handleEvent(body: WeComBotEventRequest): Promise<WeComBotEventResponse> {
    const cached = this.handledMessages.get(body.messageId);
    if (cached) return cached;

    const user = await this.resolveUser(body.fromUserId);
    if (!user) return this.remember(body.messageId, this.text(BotIntent.Unknown, "无法识别你的企业微信身份，请先联系管理员完成成员绑定。"));

    const role = this.resolveBotRole(body);
    if (role === "checkin") return this.remember(body.messageId, await this.handleCheckinBotEvent(user, body));
    if (role === "coach") return this.remember(body.messageId, await this.handleCoachBotEvent(user, body.text));

    const intent = this.router.detect(body.text);
    if (intent === BotIntent.CheckinRecord) return this.remember(body.messageId, await this.handleCheckinRecord(user, body.text, body.attachments));
    if (intent === BotIntent.CheckinConfirm) return this.remember(body.messageId, await this.handleCheckinConfirm(user));
    if (intent === BotIntent.CoachAdvice) return this.remember(body.messageId, await this.handleCoachAdvice(body.text));
    if (intent === BotIntent.ActivityQuery) return this.remember(body.messageId, this.text(intent, "当前活动：夏季 21 天运动打卡。发送你的运动内容，例如“跑步30分钟”，我会先生成待确认打卡。"));
    if (intent === BotIntent.LeaderboardQuery) return this.remember(body.messageId, this.text(intent, "排行榜查询已收到。第一阶段请先在 Web 工作台查看完整榜单，群内不会公开他人敏感数据。"));
    return this.remember(body.messageId, this.text(BotIntent.Unknown, "我还没理解你的意思。请明确选择打卡、AI教练、活动规则或排行榜，例如“打卡 跑步30分钟”或“AI教练 怎么拉伸”。"));
  }

  private resolveBotRole(body: WeComBotEventRequest): WeComBotRole | null {
    if (body.botRole === "checkin" || body.botRole === "coach") return body.botRole;
    if (body.botId && body.botId === process.env.WECOM_CHECKIN_BOT_ID) return "checkin";
    if (body.botId && body.botId === process.env.WECOM_COACH_BOT_ID) return "coach";
    return body.botId ? "coach" : null;
  }

  private async handleCheckinBotEvent(user: CurrentUser, body: WeComBotEventRequest): Promise<WeComBotEventResponse> {
    const intent = this.router.detect(body.text);
    if (intent === BotIntent.CheckinConfirm) return this.handleCheckinConfirm(user);

    const attachments = body.attachments ?? [];
    const hasImages = attachments.some((attachment) => attachment.kind === "image");
    if (!hasImages) return this.text(BotIntent.Unknown, "打卡需要同时包含文字内容和图片凭证。请补发打卡图片，或发送图片让我先识别。");

    if (this.hasImageOnly(body)) return this.handleImageOnlyCheckin(user, body);
    return this.handleCheckinRecord(user, body.text, attachments);
  }

  private async handleCoachBotEvent(user: CurrentUser, text: string): Promise<WeComBotEventResponse> {
    const safety = this.coachSafety.buildReply(text);
    if (safety.riskLevel === "escalate") return this.text(BotIntent.CoachAdvice, safety.text);

    const intent = this.router.detect(text);
    if (intent === BotIntent.ActivityQuery) return this.handleActivityQuery(user);
    if (intent === BotIntent.LeaderboardQuery) return this.text(intent, "排行榜查询已收到。群内只展示必要排名信息，不公开图片、健康咨询原文或未打卡名单。");
    return this.handleCoachAdvice(text);
  }

  private async handleActivityQuery(user: CurrentUser): Promise<WeComBotEventResponse> {
    const activity = await this.prisma.activity.findFirst({ where: { orgId: user.orgId, status: "active" }, orderBy: { startAt: "desc" } });
    if (!activity) return this.text(BotIntent.ActivityQuery, "当前没有进行中的活动。");

    const content = readActivityContent(activity.ruleJson);

    if (!content) {
      return this.text(BotIntent.ActivityQuery, `当前活动：${activity.name}。活动内容尚未配置，请联系管理员在 Web 工作台补充活动内容。`);
    }

    return this.text(BotIntent.ActivityQuery, [`当前活动：${activity.name}`, "活动内容：", content].join("\n"));
  }

  private hasImageOnly(body: WeComBotEventRequest): boolean {
    return (body.messageType === "image" || (body.attachments?.length ?? 0) > 0) && !body.text.trim();
  }

  private async resolveUser(wecomUserid: string): Promise<CurrentUser | null> {
    if (!wecomUserid.trim()) return null;

    const member = await this.prisma.member.findFirst({ where: { wecomUserid } });
    if (member) {
      return {
        id: member.id,
        orgId: member.orgId,
        displayName: member.displayName,
        role: member.role as MemberRole,
        wecomUserid: member.wecomUserid ?? undefined
      };
    }

    const provisioned = await this.provisionWeComMember(wecomUserid);
    if (!provisioned) return null;
    return {
      id: provisioned.id,
      orgId: provisioned.orgId,
      displayName: provisioned.displayName,
      role: provisioned.role as MemberRole,
      wecomUserid: provisioned.wecomUserid ?? undefined
    };
  }

  private async provisionWeComMember(wecomUserid: string) {
    const orgId = process.env.WECOM_DEFAULT_ORG_ID || (await this.prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }))?.id;
    if (!orgId) return null;
    const profile = await this.fetchWeComUserProfile(wecomUserid).catch(() => null);

    try {
      return await this.prisma.member.create({
        data: {
          id: `wecom_${createHash("sha1").update(wecomUserid).digest("hex").slice(0, 16)}`,
          orgId,
          displayName: profile?.displayName ?? `企业微信用户 ${wecomUserid.slice(-6)}`,
          department: profile?.department ?? "企业微信",
          role: MemberRole.Employee,
          status: "active",
          wecomUserid,
          externalId: wecomUserid
        }
      });
    } catch {
      return this.prisma.member.findFirst({ where: { orgId, wecomUserid } });
    }
  }

  private async fetchWeComUserProfile(wecomUserid: string): Promise<{ displayName: string; department?: string } | null> {
    const corpId = process.env.WECOM_CORP_ID;
    const secret = process.env.WECOM_APP_SECRET;
    if (!corpId || !secret) return null;

    const tokenResponse = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`);
    const tokenPayload = (await tokenResponse.json()) as { errcode?: number; access_token?: string };
    if (!tokenResponse.ok || tokenPayload.errcode !== 0 || !tokenPayload.access_token) return null;

    const userResponse = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${encodeURIComponent(tokenPayload.access_token)}&userid=${encodeURIComponent(wecomUserid)}`);
    const userPayload = (await userResponse.json()) as { errcode?: number; name?: string; department?: number[] };
    if (!userResponse.ok || userPayload.errcode !== 0 || !userPayload.name) return null;

    return {
      displayName: userPayload.name,
      department: userPayload.department?.join(",")
    };
  }

  private async handleCheckinRecord(user: CurrentUser, text: string, attachments: WeComBotAttachment[] = []): Promise<WeComBotEventResponse> {
    const activity = await this.prisma.activity.findFirst({ where: { orgId: user.orgId, status: "active" }, orderBy: { startAt: "desc" } });
    if (!activity) return this.text(BotIntent.CheckinRecord, "当前没有进行中的活动，暂时无法打卡。");

    const recognition = this.normalizeCheckinRecognition(await this.aiParser.parseImage({ textHint: text, attachments }));
    const validation = this.validateAutoCheckinRecognition(recognition, attachments.length > 0);
    if (!validation.ok) return this.text(BotIntent.CheckinRecord, validation.text);

    const checkin = await this.checkins.createSubmittedFromRecognition(user, {
      activityId: activity.id,
      sourceType: "wecom_mixed",
      inputText: text || "企业微信图文打卡",
      recognition,
      modelName: "ai-image-checkin-parser"
    });
    await this.saveInboundAttachments(checkin.id, user.orgId, activity.id, attachments);
    return this.buildAutoSubmittedResponse(checkin.id, recognition, attachments.length);
  }

  private async handleImageOnlyCheckin(user: CurrentUser, body: WeComBotEventRequest): Promise<WeComBotEventResponse> {
    const activity = await this.prisma.activity.findFirst({ where: { orgId: user.orgId, status: "active" }, orderBy: { startAt: "desc" } });
    if (!activity) return this.text(BotIntent.CheckinRecord, "当前没有进行中的活动，暂时无法打卡。");

    const attachments = body.attachments ?? [];
    const recognition = this.normalizeCheckinRecognition(await this.aiParser.parseImage({ textHint: body.text, attachments }));
    const validation = this.validateAutoCheckinRecognition(recognition, attachments.length > 0);
    if (!validation.ok) return this.text(BotIntent.CheckinRecord, validation.text);

    const checkin = await this.checkins.createSubmittedFromRecognition(user, {
      activityId: activity.id,
      sourceType: "wecom_image",
      inputText: body.text || "企业微信图片打卡",
      recognition,
      modelName: "ai-image-checkin-parser"
    });
    await this.saveInboundAttachments(checkin.id, user.orgId, activity.id, attachments);
    return this.buildAutoSubmittedResponse(checkin.id, recognition, attachments.length);
  }

  private validateAutoCheckinRecognition(recognition: RecognitionResultDto, hasImage: boolean): { ok: true } | { ok: false; text: string } {
    if (!hasImage) return { ok: false, text: "打卡需要附上运动图片凭证，请补充打卡图片后重新发送。" };

    const missing: string[] = [];
    if (!recognition.sportType?.trim()) missing.push("运动类型");
    if (!Number.isFinite(recognition.durationMin) || recognition.durationMin <= 0) missing.push("运动时长");

    if (missing.length > 0) {
      return {
        ok: false,
        text: `这次打卡还缺少${missing.join("、")}，请补充后重新发送。例如：跑步 30 分钟，并附上打卡图片。`
      };
    }

    return { ok: true };
  }

  private normalizeCheckinRecognition(recognition: RecognitionResultDto): RecognitionResultDto {
    const sportType = recognition.sportType?.trim() || "";
    const durationMin = Number(recognition.durationMin);
    return {
      ...recognition,
      sportType,
      durationMin,
      calorieEstimate: recognition.calorieEstimate ?? (sportType && durationMin > 0 ? this.estimateCalories(sportType, durationMin, recognition.intensity) : undefined)
    };
  }

  private estimateCalories(sportType: string, durationMin: number, intensity: RecognitionResultDto["intensity"]): number {
    const normalized = sportType.toLowerCase();
    const base = normalized.includes("run") || sportType.includes("跑") ? 8.5 : normalized.includes("cycl") || sportType.includes("骑") ? 6.5 : normalized.includes("walk") || sportType.includes("走") ? 4.8 : 5.5;
    const factor = intensity === "high" ? 1.2 : intensity === "low" ? 0.82 : 1;
    return Math.max(1, Math.round(durationMin * base * factor));
  }

  private buildAutoSubmittedResponse(checkinId: string, recognition: RecognitionResultDto, attachmentCount: number): WeComBotEventResponse {
    return {
      replyType: "markdown",
      intent: BotIntent.CheckinRecord,
      checkinId,
      text: `打卡成功：${recognition.sportType}，${recognition.durationMin} 分钟，约消耗 ${recognition.calorieEstimate ?? 0} 千卡${recognition.distanceKm ? `，距离 ${recognition.distanceKm} 公里` : ""}，已关联 ${attachmentCount} 张图片。`
    };
  }

  private async saveInboundAttachments(checkinId: string, orgId: string, activityId: string, attachments: WeComBotAttachment[]) {
    await Promise.all(
      attachments
        .filter((attachment) => attachment.kind === "image")
        .map(async (attachment, index) => {
          const persisted = await this.persistInboundImage(orgId, activityId, checkinId, attachment, index);
          return this.prisma.attachment.create({
            data: {
              checkinId,
              localPath: persisted?.localPath ?? this.buildPendingImagePath(orgId, activityId, checkinId, attachment, index),
              mimeType: attachment.mimeType ?? "image/jpeg",
              sizeBytes: persisted?.sizeBytes ?? attachment.sizeBytes ?? 0,
              status: "active"
            }
          });
        })
    );
  }

  private async persistInboundImage(orgId: string, activityId: string, checkinId: string, attachment: WeComBotAttachment, index: number): Promise<{ localPath: string; sizeBytes: number } | null> {
    const buffer = await this.readInboundImageBuffer(attachment);
    if (!buffer) return null;

    const root = process.env.LOCAL_STORAGE_ROOT ?? "./storage/uploads";
    const safeName = this.buildSafeImageName(attachment, index);
    const relativePath = `wecom/${orgId}/${activityId}/${checkinId}/${safeName}`;
    const absolutePath = join(root, relativePath);

    await mkdir(join(root, "wecom", orgId, activityId, checkinId), { recursive: true });
    await writeFile(absolutePath, buffer);
    return { localPath: relativePath, sizeBytes: buffer.byteLength };
  }

  private async readInboundImageBuffer(attachment: WeComBotAttachment): Promise<Buffer | null> {
    if (attachment.base64Data) {
      const base64Data = attachment.base64Data.includes(",") ? attachment.base64Data.split(",").pop() ?? "" : attachment.base64Data;
      return Buffer.from(base64Data, "base64");
    }

    if (!attachment.url) return null;

    try {
      const response = await fetch(attachment.url);
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  private buildPendingImagePath(orgId: string, activityId: string, checkinId: string, attachment: WeComBotAttachment, index: number): string {
    const safeName = this.buildSafeImageName(attachment, index);
    return `wecom-pending/${orgId}/${activityId}/${checkinId}/${safeName}`;
  }

  private buildSafeImageName(attachment: WeComBotAttachment, index: number): string {
    return basename(attachment.filename ?? `${attachment.mediaId ?? attachment.fileId ?? `image-${index}`}.jpg`).replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  private async handleCheckinConfirm(user: CurrentUser): Promise<WeComBotEventResponse> {
    const checkin = await this.checkins.submitLatestRecognized(user);
    return {
      replyType: "markdown",
      intent: BotIntent.CheckinConfirm,
      checkinId: checkin.id,
      text: "已提交今日打卡，已进入活动统计。"
    };
  }

  private async handleCoachAdvice(text: string): Promise<WeComBotEventResponse> {
    const reply = this.coachSafety.buildReply(text);
    if (reply.riskLevel === "escalate") {
      return {
        replyType: "markdown",
        intent: BotIntent.CoachAdvice,
        text: reply.text
      };
    }

    const modelReply = await this.aiProvider.generateCoachAdvice(text);
    const outputSafety = this.coachSafety.validateOutput(modelReply.answer);
    return {
      replyType: "markdown",
      intent: BotIntent.CoachAdvice,
      text: outputSafety.riskLevel === "escalate" ? outputSafety.text : modelReply.answer
    };
  }

  private text(intent: BotIntent, text: string): WeComBotEventResponse {
    return { replyType: "markdown", intent, text };
  }

  private remember(messageId: string, response: WeComBotEventResponse): WeComBotEventResponse {
    this.handledMessages.set(messageId, response);
    return response;
  }
}
