import { Inject, Injectable } from "@nestjs/common";
import { ApiErrorCode, CheckinStatus, type CurrentUser } from "@openfit/shared";
import { Prisma } from "@prisma/client";
import { ApiException } from "../common/api-response.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class AdminCheckinsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.checkin.findMany({
      include: { member: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return rows.map((row) => ({
      id: row.id,
      activityId: row.activityId,
      memberId: row.memberId,
      memberName: row.member.displayName,
      status: row.status,
      sportType: row.sportType ?? undefined,
      durationMin: row.durationMin ?? undefined,
      distanceKm: row.distanceKm ?? undefined,
      intensity: row.intensity ?? undefined,
      calorieEstimate: row.calorieEstimate ?? undefined,
      submittedAt: row.submittedAt?.toISOString(),
      createdAt: row.createdAt.toISOString()
    }));
  }

  async invalidate(user: CurrentUser, checkinId: string, reason: string) {
    const checkin = await this.prisma.checkin.findFirst({ where: { id: checkinId } });
    if (!checkin) throw new ApiException(ApiErrorCode.CheckinNotFound, "打卡记录不存在", 404);
    if (!reason.trim()) throw new ApiException("CHECKIN_INVALIDATE_REASON_REQUIRED", "作废原因不能为空");

    const updated = await this.prisma.checkin.update({
      where: { id: checkinId },
      data: { status: CheckinStatus.Invalid }
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "checkin.invalidate",
        targetType: "checkin",
        targetId: checkinId,
        detailJson: { reason, previousStatus: checkin.status } as Prisma.InputJsonValue
      }
    });

    return updated;
  }

  async restore(user: CurrentUser, checkinId: string) {
    const checkin = await this.prisma.checkin.findFirst({ where: { id: checkinId } });
    if (!checkin) throw new ApiException(ApiErrorCode.CheckinNotFound, "打卡记录不存在", 404);

    const latestInvalidateAudit = await this.prisma.auditLog.findFirst({
      where: {
        action: "checkin.invalidate",
        targetType: "checkin",
        targetId: checkinId
      },
      orderBy: { createdAt: "desc" }
    });
    const previousStatus = readPreviousStatus(latestInvalidateAudit?.detailJson);
    const restoredStatus = previousStatus ?? CheckinStatus.Submitted;

    const updated = await this.prisma.checkin.update({
      where: { id: checkinId },
      data: { status: restoredStatus }
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "checkin.restore",
        targetType: "checkin",
        targetId: checkinId,
        detailJson: { previousStatus: checkin.status, restoredStatus } as Prisma.InputJsonValue
      }
    });

    return updated;
  }
}

function readPreviousStatus(detailJson: unknown): CheckinStatus | undefined {
  if (!detailJson || typeof detailJson !== "object" || !("previousStatus" in detailJson)) return undefined;
  const value = (detailJson as { previousStatus?: unknown }).previousStatus;
  if (value === CheckinStatus.Submitted || value === CheckinStatus.Corrected || value === CheckinStatus.Recognized) return value;
  return undefined;
}
