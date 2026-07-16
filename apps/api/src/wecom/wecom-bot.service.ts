import { Inject, Injectable, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { BotIntent, MemberRole, type CurrentUser, type RecognitionResultDto, type WeComBotAttachment, type WeComBotEventRequest, type WeComBotEventResponse, type WeComBotRole, type WeComGroupDto } from "@openfit/shared";
import { AiCheckinParserService } from "../ai/ai-checkin-parser.service.js";
import { CoachConversationService, type CoachConversationMessageInput } from "../ai/coach-conversation.service.js";
import { AiProviderService } from "../ai/ai-provider.service.js";
import { CheckinsService } from "../checkins/checkins.service.js";
import { GroupsService } from "../groups/groups.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { BotIntentRouterService } from "./bot-intent-router.service.js";
import { CoachSafetyService } from "./coach-safety.service.js";

function readActivityContent(ruleJson: unknown): string {
  if (!ruleJson || typeof ruleJson !== "object" || Array.isArray(ruleJson)) return "";
  const content = (ruleJson as Record<string, unknown>).content;
  return typeof content === "string" ? content.trim() : "";
}

const invalidAiSportTypes = new Set(["general", "running", "cycling", "walking", "workout", "fitness", "unknown", "other"]);

@Injectable()
export class WeComBotService {
  private readonly handledMessages = new Map<string, WeComBotEventResponse>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CheckinsService) private readonly checkins: CheckinsService,
    @Inject(BotIntentRouterService) private readonly router: BotIntentRouterService,
    @Inject(CoachSafetyService) private readonly coachSafety: CoachSafetyService,
    @Inject(AiCheckinParserService) private readonly aiParser: AiCheckinParserService,
    @Inject(AiProviderService) private readonly aiProvider: AiProviderService,
    @Inject(GroupsService) private readonly groups: GroupsService,
    @Optional() @Inject(CoachConversationService) private readonly conversations?: CoachConversationService
  ) {}

  async handleEvent(body: WeComBotEventRequest): Promise<WeComBotEventResponse> {
    const cached = this.handledMessages.get(body.messageId);
    if (cached) return cached;

    const user = await this.resolveUser(body.fromUserId);
    if (!user) return this.remember(body.messageId, this.text(BotIntent.Unknown, "无法识别你的企业微信身份，请先联系管理员完成成员绑定。"));

    const role = this.resolveBotRole(body);
    if (role) {
      const boundGroup = await this.groups.bindFromWeComMessage(user.orgId, body.chatId, body.fromUserId, body.text);
      if (boundGroup) return this.remember(body.messageId, this.buildGroupBoundResponse(boundGroup));
      if (this.containsBindCode(body.text)) {
        return this.remember(body.messageId, this.text(BotIntent.Unknown, "未找到可绑定的群。请确认口令是否正确、是否已经绑定，口令格式类似：OF-1CA0A9。推荐发送：绑定群 OF-1CA0A9"));
      }
      await this.groups.observeMemberByChat(user.orgId, body.chatId, body.fromUserId);
    }
    if (role === "checkin") return this.remember(body.messageId, await this.handleCheckinBotEvent(user, body));
    if (role === "coach") return this.remember(body.messageId, await this.handleCoachBotEvent(user, body));

    const intent = this.router.detect(body.text);
    if (intent === BotIntent.CheckinRecord) return this.remember(body.messageId, await this.handleCheckinRecord(user, body.text, body.attachments, body.chatId));
    if (intent === BotIntent.CheckinConfirm) return this.remember(body.messageId, await this.handleCheckinConfirm(user));
    if (intent === BotIntent.CoachAdvice) return this.remember(body.messageId, await this.handleCoachAdvice(user, body));
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

  private containsBindCode(text: string): boolean {
    return /OF-[A-Z0-9]{6}/i.test(text);
  }

  private buildGroupBoundResponse(group: WeComGroupDto): WeComBotEventResponse {
    return this.text(BotIntent.Unknown, `群绑定成功：${group.name}。\n绑定口令是 ${group.bindCode}，后续后台提醒会通过 Open Fit 打卡助手发送到当前群。`);
  }

  private async handleCheckinBotEvent(user: CurrentUser, body: WeComBotEventRequest): Promise<WeComBotEventResponse> {
    const intent = this.router.detect(body.text);
    if (intent === BotIntent.CheckinConfirm) return this.handleCheckinConfirm(user);

    const attachments = body.attachments ?? [];
    const hasImages = attachments.some((attachment) => attachment.kind === "image");
    if (!hasImages) return this.text(BotIntent.Unknown, "打卡需要同时包含文字内容和图片凭证。请补发打卡图片，或发送图片让我先识别。");

    if (this.hasImageOnly(body)) return this.handleImageOnlyCheckin(user, body);
    return this.handleCheckinRecord(user, body.text, attachments, body.chatId);
  }

  private async handleCoachBotEvent(user: CurrentUser, body: WeComBotEventRequest): Promise<WeComBotEventResponse> {
    const text = body.text;
    const safety = this.coachSafety.buildReply(text);
    if (safety.riskLevel === "escalate") return this.text(BotIntent.CoachAdvice, safety.text);

    const intent = this.router.detect(text);
    if (intent === BotIntent.ActivityQuery) return this.handleActivityQuery(user, body.chatId);
    if (intent === BotIntent.LeaderboardQuery) return this.text(intent, "排行榜查询已收到。群内只展示必要排名信息，不公开图片、健康咨询原文或未打卡名单。");
    return this.handleCoachAdvice(user, body);
  }

  private async handleActivityQuery(user: CurrentUser, chatId?: string): Promise<WeComBotEventResponse> {
    const groupId = await this.resolveGroupId(user.orgId, chatId);
    const activity = await this.prisma.activity.findFirst({ where: { orgId: user.orgId, status: "active", ...(groupId ? { groupId } : {}) }, orderBy: { startAt: "desc" } });
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

  private async handleCheckinRecord(user: CurrentUser, text: string, attachments: WeComBotAttachment[] = [], chatId?: string): Promise<WeComBotEventResponse> {
    const groupId = await this.resolveGroupId(user.orgId, chatId);
    const activity = await this.prisma.activity.findFirst({ where: { orgId: user.orgId, status: "active", ...(groupId ? { groupId } : {}) }, orderBy: { startAt: "desc" } });
    if (!activity) return this.text(BotIntent.CheckinRecord, "当前没有进行中的活动，暂时无法打卡。");

    const parsed = await this.parseAutoCheckin({ textHint: text, attachments });
    if (!parsed.ok) return this.text(BotIntent.CheckinRecord, parsed.text);
    const recognition = this.normalizeCheckinRecognition(parsed.recognition);
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
    const parsed = await this.parseAutoCheckin({ textHint: body.text, attachments });
    if (!parsed.ok) return this.text(BotIntent.CheckinRecord, parsed.text);
    const recognition = this.normalizeCheckinRecognition(parsed.recognition);
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
    if (invalidAiSportTypes.has(recognition.sportType.trim().toLowerCase())) missing.push("运动类型");
    if (!Number.isFinite(recognition.durationMin) || recognition.durationMin <= 0) missing.push("运动时长");
    if (!Number.isFinite(recognition.calorieEstimate) || (recognition.calorieEstimate ?? 0) <= 0) missing.push("消耗能量");

    if (missing.length > 0) {
      return {
        ok: false,
        text: `这次打卡还缺少${missing.join("、")}，请补充后重新发送。例如：跑步 30 分钟，并附上打卡图片。`
      };
    }

    return { ok: true };
  }

  private async resolveGroupId(orgId: string, chatId?: string): Promise<string | undefined> {
    if (!chatId?.trim()) return undefined;
    const group = await this.prisma.weComGroup.findFirst({ where: { orgId, chatId, status: "active" }, select: { id: true } });
    return group?.id;
  }

  private normalizeCheckinRecognition(recognition: RecognitionResultDto): RecognitionResultDto {
    const sportType = recognition.sportType?.trim() || "";
    const durationMin = Number(recognition.durationMin);
    return {
      ...recognition,
      sportType,
      durationMin
    };
  }

  private async parseAutoCheckin(input: { textHint?: string; attachments: WeComBotAttachment[] }): Promise<{ ok: true; recognition: RecognitionResultDto } | { ok: false; text: string }> {
    try {
      return { ok: true, recognition: await this.aiParser.parseImage(input) };
    } catch {
      return {
        ok: false,
        text: "AI 打卡识别暂时失败，未创建打卡记录。请稍后重新发送图片和文字打卡，或联系管理员检查 AI_BASE_URL、AI_API_KEY 和模型视觉识别能力。"
      };
    }
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

  private isClearCoachContextCommand(text: string): boolean {
    return /^(清空上下文|清除上下文|重新开始|新话题)$/i.test(text.trim());
  }

  private async handleCoachAdvice(user: CurrentUser, body: WeComBotEventRequest): Promise<WeComBotEventResponse> {
    const text = body.text;
    const wecomUserid = user.wecomUserid ?? body.fromUserId;
    if (this.isClearCoachContextCommand(text)) {
      await this.conversations?.clearConversation({ orgId: user.orgId, wecomUserid, chatId: body.chatId });
      return this.text(BotIntent.CoachAdvice, "已清空当前 AI 教练会话上下文。你可以直接开始一个新问题。");
    }

    const reply = this.coachSafety.buildReply(text);
    if (reply.riskLevel === "escalate") {
      return {
        replyType: "markdown",
        intent: BotIntent.CoachAdvice,
        text: reply.text
      };
    }

    const context = await this.conversations?.buildContext({ orgId: user.orgId, memberId: user.id, wecomUserid, chatId: body.chatId });
    const messages: CoachConversationMessageInput[] = [];
    if (context?.summary) {
      messages.push({ role: "system", content: `以下是当前用户此前与 AI 教练的会话摘要，只用于理解追问上下文：\n${context.summary}` });
    }
    messages.push(...(context?.messages ?? []), { role: "user", content: text });
    const modelReply = await this.aiProvider.generateCoachAdviceWithMessages(messages);
    const outputSafety = this.coachSafety.validateOutput(modelReply.answer);
    const safeText = outputSafety.riskLevel === "escalate" ? outputSafety.text : modelReply.answer;
    if (outputSafety.riskLevel !== "escalate") {
      await this.conversations?.appendExchange({
        orgId: user.orgId,
        memberId: user.id,
        wecomUserid,
        chatId: body.chatId,
        userText: text,
        assistantText: safeText
      });
    }
    return {
      replyType: "markdown",
      intent: BotIntent.CoachAdvice,
      text: safeText
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
