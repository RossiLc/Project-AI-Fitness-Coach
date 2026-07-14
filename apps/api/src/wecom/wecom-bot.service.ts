import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { BotIntent, MemberRole, type CurrentUser, type WeComBotAttachment, type WeComBotEventRequest, type WeComBotEventResponse, type WeComBotRole } from "@openfit/shared";
import { AiCheckinParserService } from "../ai/ai-checkin-parser.service.js";
import { AiProviderService } from "../ai/ai-provider.service.js";
import { CheckinsService } from "../checkins/checkins.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { BotIntentRouterService } from "./bot-intent-router.service.js";
import { CoachSafetyService } from "./coach-safety.service.js";

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
    if (role === "coach") return this.remember(body.messageId, await this.handleCoachBotEvent(body.text));

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

  private async handleCoachBotEvent(text: string): Promise<WeComBotEventResponse> {
    const safety = this.coachSafety.buildReply(text);
    if (safety.riskLevel === "escalate") return this.text(BotIntent.CoachAdvice, safety.text);

    const intent = this.router.detect(text);
    if (intent === BotIntent.ActivityQuery) return this.text(intent, "当前活动：夏季 21 天运动打卡。打卡请使用 Open Fit 打卡助手；这里可以查询规则、榜单和训练建议。");
    if (intent === BotIntent.LeaderboardQuery) return this.text(intent, "排行榜查询已收到。群内只展示必要排名信息，不公开图片、健康咨询原文或未打卡名单。");
    return this.handleCoachAdvice(text);
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

    try {
      return await this.prisma.member.create({
        data: {
          id: `wecom_${createHash("sha1").update(wecomUserid).digest("hex").slice(0, 16)}`,
          orgId,
          displayName: `企业微信用户 ${wecomUserid.slice(-6)}`,
          department: "企业微信",
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

  private async handleCheckinRecord(user: CurrentUser, text: string, attachments: WeComBotAttachment[] = []): Promise<WeComBotEventResponse> {
    const activity = await this.prisma.activity.findFirst({ where: { orgId: user.orgId, status: "active" }, orderBy: { startAt: "desc" } });
    if (!activity) return this.text(BotIntent.CheckinRecord, "当前没有进行中的活动，暂时无法打卡。");

    const result = await this.checkins.recognize(user, activity.id, text);
    if (attachments.length > 0) await this.saveInboundAttachments(result.checkinId, user.orgId, activity.id, attachments);
    const recognition = result.recognition;
    return {
      replyType: "markdown",
      intent: BotIntent.CheckinRecord,
      checkinId: result.checkinId,
      text: `已生成待确认打卡：${recognition.sportType}，${recognition.durationMin} 分钟${recognition.distanceKm ? `，${recognition.distanceKm} 公里` : ""}${attachments.length > 0 ? "，已关联图片附件" : ""}。回复“确认”提交，或到 Web 工作台修正后提交。`
    };
  }

  private async handleImageOnlyCheckin(user: CurrentUser, body: WeComBotEventRequest): Promise<WeComBotEventResponse> {
    const activity = await this.prisma.activity.findFirst({ where: { orgId: user.orgId, status: "active" }, orderBy: { startAt: "desc" } });
    if (!activity) return this.text(BotIntent.CheckinRecord, "当前没有进行中的活动，暂时无法打卡。");

    const attachments = body.attachments ?? [];
    const recognition = await this.aiParser.parseImage({ textHint: body.text, attachments });
    const result = await this.checkins.recognizeFromImage(user, activity.id, recognition, "企业微信图片打卡");
    await this.saveInboundAttachments(result.checkinId, user.orgId, activity.id, attachments);
    return {
      replyType: "markdown",
      intent: BotIntent.CheckinRecord,
      checkinId: result.checkinId,
      text: `AI 图片识别已生成待确认打卡：${recognition.sportType}，${recognition.durationMin} 分钟${recognition.distanceKm ? `，${recognition.distanceKm} 公里` : ""}。回复“确认”提交，识别不准请补充文字后重新打卡。`
    };
  }

  private async saveInboundAttachments(checkinId: string, orgId: string, activityId: string, attachments: WeComBotAttachment[]) {
    await Promise.all(
      attachments
        .filter((attachment) => attachment.kind === "image")
        .map((attachment, index) =>
          this.prisma.attachment.create({
            data: {
              checkinId,
              localPath: this.buildPendingImagePath(orgId, activityId, checkinId, attachment, index),
              mimeType: attachment.mimeType ?? "image/jpeg",
              sizeBytes: attachment.sizeBytes ?? 0,
              status: "active"
            }
          })
        )
    );
  }

  private buildPendingImagePath(orgId: string, activityId: string, checkinId: string, attachment: WeComBotAttachment, index: number): string {
    const safeName = (attachment.filename ?? `${attachment.mediaId ?? attachment.fileId ?? `image-${index}`}.jpg`).replace(/[^a-zA-Z0-9._-]/g, "_");
    return `wecom-pending/${orgId}/${activityId}/${checkinId}/${safeName}`;
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
