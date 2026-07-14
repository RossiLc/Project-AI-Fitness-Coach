import { Inject, Injectable } from "@nestjs/common";
import { ApiErrorCode, CheckinStatus, type CurrentUser, type RecognitionResultDto, type SubmitCheckinRequest } from "@openfit/shared";
import { Prisma } from "@prisma/client";
import { ApiException } from "../common/api-response.js";
import { AiCheckinParserService } from "../ai/ai-checkin-parser.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RuleRecognizerService } from "./rule-recognizer.service.js";

@Injectable()
export class CheckinsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RuleRecognizerService) private readonly recognizer: RuleRecognizerService,
    @Inject(AiCheckinParserService) private readonly aiParser?: AiCheckinParserService
  ) {}

  async recognize(user: CurrentUser, activityId: string, text: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id: activityId, status: "active" } });
    if (!activity) throw new ApiException(ApiErrorCode.ActivityNotActive, "当前活动不可用");

    const recognition = this.aiParser ? await this.aiParser.parse(text) : this.recognizer.recognize(text);
    const checkin = await this.prisma.checkin.create({
      data: {
        activityId,
        memberId: user.id,
        status: CheckinStatus.Recognized,
        sourceType: "text",
        recognitions: {
          create: {
            inputText: text,
            resultJson: recognition as unknown as Prisma.InputJsonValue,
            confidence: recognition.confidence
          }
        }
      }
    });

    return {
      checkinId: checkin.id,
      status: CheckinStatus.Recognized,
      recognition
    };
  }

  async recognizeFromImage(user: CurrentUser, activityId: string, recognition: RecognitionResultDto, inputText = "企业微信图片打卡") {
    const activity = await this.prisma.activity.findFirst({ where: { id: activityId, status: "active" } });
    if (!activity) throw new ApiException(ApiErrorCode.ActivityNotActive, "当前活动不可用");

    const checkin = await this.prisma.checkin.create({
      data: {
        activityId,
        memberId: user.id,
        status: CheckinStatus.Recognized,
        sourceType: "image",
        sportType: recognition.sportType,
        durationMin: recognition.durationMin,
        distanceKm: recognition.distanceKm,
        intensity: recognition.intensity,
        calorieEstimate: recognition.calorieEstimate,
        recognitions: {
          create: {
            inputText,
            sourceType: "image",
            resultJson: recognition as unknown as Prisma.InputJsonValue,
            confidence: recognition.confidence,
            modelName: "ai-image-checkin-parser"
          }
        }
      }
    });

    return {
      checkinId: checkin.id,
      status: CheckinStatus.Recognized,
      recognition
    };
  }

  async submit(user: CurrentUser, id: string, body: SubmitCheckinRequest) {
    const existing = await this.prisma.checkin.findFirst({ where: { id, memberId: user.id } });
    if (!existing) throw new ApiException(ApiErrorCode.CheckinNotFound, "打卡记录不存在", 404);
    if (existing.status === CheckinStatus.Submitted) {
      throw new ApiException(ApiErrorCode.CheckinAlreadySubmitted, "该打卡已确认提交");
    }

    return this.prisma.checkin.update({
      where: { id },
      data: {
        status: CheckinStatus.Submitted,
        sportType: body.sportType,
        durationMin: body.durationMin,
        distanceKm: body.distanceKm,
        intensity: body.intensity,
        calorieEstimate: body.calorieEstimate,
        submittedAt: new Date()
      }
    });
  }

  async mine(user: CurrentUser) {
    return this.prisma.checkin.findMany({
      where: { memberId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30
    });
  }

  async submitLatestRecognized(user: CurrentUser) {
    const latest = await this.prisma.checkin.findFirst({
      where: { memberId: user.id, status: CheckinStatus.Recognized },
      orderBy: { createdAt: "desc" }
    });
    if (!latest) throw new ApiException(ApiErrorCode.CheckinNotFound, "没有待确认的打卡记录", 404);
    const attachmentCount = await this.prisma.attachment.count({ where: { checkinId: latest.id, status: "active" } });
    if (attachmentCount <= 0) throw new ApiException("CHECKIN_IMAGE_REQUIRED", "请先补充打卡图片，再确认提交。");

    return this.prisma.checkin.update({
      where: { id: latest.id },
      data: {
        status: CheckinStatus.Submitted,
        submittedAt: new Date()
      }
    });
  }
}
