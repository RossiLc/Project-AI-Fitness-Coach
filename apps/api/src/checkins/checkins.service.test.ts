import { describe, expect, it } from "vitest";
import { CheckinStatus, type CurrentUser } from "@openfit/shared";
import { CheckinsService } from "./checkins.service.js";
import { RuleRecognizerService } from "./rule-recognizer.service.js";

describe("CheckinsService", () => {
  const user: CurrentUser = {
    id: "employee_demo",
    orgId: "org_demo",
    displayName: "员工小李",
    role: "employee" as CurrentUser["role"]
  };

  it("提交当前用户最近一条待确认打卡", async () => {
    const prisma = {
      checkin: {
        findFirst: async () => ({
          id: "chk_latest",
          memberId: user.id,
          status: CheckinStatus.Recognized,
          sportType: "跑步",
          durationMin: 30,
          distanceKm: 5,
          intensity: "moderate",
          calorieEstimate: 255
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "chk_latest",
          status: data.status,
          submittedAt: data.submittedAt
        })
      },
      attachment: {
        count: async () => 1
      }
    };
    const service = new CheckinsService(prisma as never, new RuleRecognizerService());

    const result = await service.submitLatestRecognized(user);

    expect(result.id).toBe("chk_latest");
    expect(result.status).toBe(CheckinStatus.Submitted);
    expect(result.submittedAt).toBeInstanceOf(Date);
  });

  it("最近一条待确认打卡没有图片附件时拒绝提交", async () => {
    const prisma = {
      checkin: {
        findFirst: async () => ({
          id: "chk_latest",
          memberId: user.id,
          status: CheckinStatus.Recognized,
          sportType: "跑步",
          durationMin: 30
        }),
        update: async () => {
          throw new Error("不应提交无图片打卡");
        }
      },
      attachment: {
        count: async () => 0
      }
    };
    const service = new CheckinsService(prisma as never, new RuleRecognizerService());

    await expect(service.submitLatestRecognized(user)).rejects.toMatchObject({
      response: {
        error: {
          message: "请先补充打卡图片，再确认提交。"
        }
      }
    });
  });

  it("完成文本识别到确认提交的状态流", async () => {
    const created = {
      id: "chk_flow",
      memberId: user.id,
      status: CheckinStatus.Recognized,
      sportType: null,
      durationMin: null,
      distanceKm: null,
      intensity: null,
      calorieEstimate: null
    };
    const prisma = {
      activity: {
        findFirst: async () => ({ id: "act_demo", status: "active" })
      },
      checkin: {
        create: async () => created,
        findFirst: async () => created,
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          ...created,
          ...data
        })
      },
      attachment: {
        count: async () => 1
      }
    };
    const service = new CheckinsService(prisma as never, new RuleRecognizerService());

    const recognized = await service.recognize(user, "act_demo", "快走40分钟 4公里");
    const submitted = await service.submit(user, recognized.checkinId, {
      sportType: recognized.recognition.sportType,
      durationMin: recognized.recognition.durationMin,
      distanceKm: recognized.recognition.distanceKm,
      intensity: recognized.recognition.intensity,
      calorieEstimate: recognized.recognition.calorieEstimate
    });

    expect(recognized.status).toBe(CheckinStatus.Recognized);
    expect(submitted.status).toBe(CheckinStatus.Submitted);
    expect(submitted.durationMin).toBe(40);
    expect(submitted.distanceKm).toBe(4);
  });

  it("根据 AI 识别结果直接创建企业微信已提交打卡", async () => {
    const createdRows: unknown[] = [];
    const prisma = {
      activity: {
        findFirst: async () => ({ id: "act_demo", status: "active" })
      },
      checkin: {
        create: async (args: unknown) => {
          createdRows.push(args);
          return { id: "chk_auto", ...(args as { data: Record<string, unknown> }).data };
        }
      }
    };
    const service = new CheckinsService(prisma as never, new RuleRecognizerService());

    const result = await service.createSubmittedFromRecognition(user, {
      activityId: "act_demo",
      sourceType: "wecom_mixed",
      inputText: "打卡 跑步30分钟",
      modelName: "ai-image-checkin-parser",
      recognition: {
        sportType: "跑步",
        durationMin: 30,
        intensity: "moderate",
        calorieEstimate: 255,
        confidence: 0.82,
        notice: "AI 已识别"
      }
    });

    expect(result.id).toBe("chk_auto");
    expect(result.status).toBe(CheckinStatus.Submitted);
    expect(result.submittedAt).toBeInstanceOf(Date);
    expect(createdRows[0]).toMatchObject({
      data: {
        activityId: "act_demo",
        memberId: "employee_demo",
        status: CheckinStatus.Submitted,
        sourceType: "wecom_mixed",
        sportType: "跑步",
        durationMin: 30,
        calorieEstimate: 255,
        recognitions: {
          create: {
            inputText: "打卡 跑步30分钟",
            sourceType: "wecom_mixed",
            confidence: 0.82,
            modelName: "ai-image-checkin-parser"
          }
        }
      }
    });
  });
});
