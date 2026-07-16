import { Inject, Injectable } from "@nestjs/common";
import {
  CheckinStatus,
  MemberRole,
  type AdminCheckinDto,
  type CurrentUser,
  type MemberCheckinHistoryDto,
  type MemberDto
} from "@openfit/shared";
import { Prisma } from "@prisma/client";
import { ApiException } from "../common/api-response.js";
import { PrismaService } from "../prisma/prisma.service.js";

type MemberRow = {
  id: string;
  displayName: string;
  department: string | null;
  role: string;
  status: string;
  externalId: string | null;
  wecomUserid: string | null;
};

type CheckinHistoryRow = {
  id: string;
  activityId: string;
  memberId: string;
  member: { displayName: string };
  status: string;
  sportType: string | null;
  durationMin: number | null;
  distanceKm: number | null;
  intensity: string | null;
  calorieEstimate: number | null;
  submittedAt: Date | null;
  createdAt: Date;
  attachments?: Array<{
    id: string;
    checkinId: string | null;
    localPath: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
    createdAt: Date;
  }>;
};

interface ListMembersOptions {
  missingToday?: boolean;
  date?: Date;
  groupId?: string;
}

@Injectable()
export class MembersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(orgId: string, options: ListMembersOptions = {}): Promise<MemberDto[]> {
    const members = options.groupId
      ? (
          await this.prisma.weComGroupMember.findMany({
            where: { groupId: options.groupId, status: "active", group: { orgId } },
            include: { member: true },
            orderBy: { createdAt: "asc" }
          })
        ).map((item) => item.member)
      : await this.prisma.member.findMany({
          where: { orgId, ...(options.missingToday ? { status: "active" } : {}) },
          orderBy: { createdAt: "asc" }
        });
    if (!options.missingToday) return members.map(toDto);

    const activity = await this.prisma.activity.findFirst({ where: { orgId, status: "active", ...(options.groupId ? { groupId: options.groupId } : {}) }, orderBy: { startAt: "desc" } });
    if (!activity) return members.map(toDto);

    const { start, end } = getDayRange(options.date ?? new Date());
    const submitted = await this.prisma.checkin.findMany({
      where: {
        activityId: activity.id,
        status: { in: [CheckinStatus.Submitted, CheckinStatus.Corrected] },
        submittedAt: { gte: start, lt: end }
      },
      select: { memberId: true }
    });
    const submittedMemberIds = new Set(submitted.map((item) => item.memberId));
    return members.filter((member) => !submittedMemberIds.has(member.id)).map(toDto);
  }

  async getCheckinHistory(orgId: string, memberId: string): Promise<MemberCheckinHistoryDto> {
    const member = await this.prisma.member.findFirst({ where: { id: memberId, orgId } });
    if (!member) throw new ApiException("MEMBER_NOT_FOUND", "成员不存在", 404);

    const checkins = await this.prisma.checkin.findMany({
      where: { memberId },
      include: { member: true, attachments: { where: { status: "active" }, orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return {
      member: toDto(member),
      checkins: checkins.map(toAdminCheckinDto)
    };
  }

  async bindWeComUserid(actorId: string, memberId: string, wecomUserid: string): Promise<MemberDto> {
    const member = await this.prisma.member.update({
      where: { id: memberId },
      data: { wecomUserid }
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "member.bind_wecom_userid",
        targetType: "member",
        targetId: memberId,
        detailJson: { wecomUserid } as Prisma.InputJsonValue
      }
    });

    return toDto(member);
  }

  async findByWeComUserid(wecomUserid: string): Promise<CurrentUser | undefined> {
    const member = await this.prisma.member.findFirst({ where: { wecomUserid } });
    if (!member) return undefined;
    return {
      id: member.id,
      orgId: member.orgId,
      displayName: member.displayName,
      role: member.role as MemberRole,
      wecomUserid: member.wecomUserid ?? undefined
    };
  }
}

function toAdminCheckinDto(row: CheckinHistoryRow): AdminCheckinDto {
  return {
    id: row.id,
    activityId: row.activityId,
    memberId: row.memberId,
    memberName: row.member.displayName,
    status: row.status as CheckinStatus,
    sportType: row.sportType ?? undefined,
    durationMin: row.durationMin ?? undefined,
    distanceKm: row.distanceKm ?? undefined,
    intensity: row.intensity ?? undefined,
    calorieEstimate: row.calorieEstimate ?? undefined,
    submittedAt: row.submittedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    attachments: row.attachments?.map((attachment) => ({
      id: attachment.id,
      checkinId: attachment.checkinId ?? undefined,
      localPath: attachment.localPath,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      status: attachment.status as "active" | "deleted",
      createdAt: attachment.createdAt.toISOString()
    }))
  };
}

function toDto(member: MemberRow): MemberDto {
  return {
    id: member.id,
    displayName: member.displayName,
    department: member.department ?? undefined,
    role: member.role as MemberRole,
    status: member.status,
    externalId: member.externalId ?? undefined,
    wecomUserid: member.wecomUserid ?? undefined,
    mappingStatus: member.wecomUserid ? "bound" : "unbound"
  };
}

function getDayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
