import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CheckinStatus,
  MemberRole,
  type AdminCheckinDto,
  type CurrentUser,
  type MemberCheckinHistoryDto,
  type MemberDto,
  type SyncWeComMembersResponse
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
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config?: ConfigService
  ) {}

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

  async syncFromWeComMock(orgId: string): Promise<SyncWeComMembersResponse> {
    if (this.config?.get<string>("WECOM_CORP_ID") && this.config?.get<string>("WECOM_APP_SECRET")) {
      return this.syncFromWeComApi(orgId);
    }
    const totalLocalMembers = await this.prisma.member.count({ where: { orgId } });
    return {
      mode: "missing_config",
      totalLocalMembers,
      created: 0,
      updated: 0,
      message: "企业微信通讯录同步入口已预留；当前 mock 模式只检查本地成员与 userid 映射。"
    };
  }

  private async syncFromWeComApi(orgId: string): Promise<SyncWeComMembersResponse> {
    const token = await this.fetchAccessToken();
    const response = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/simplelist?access_token=${encodeURIComponent(token)}&department_id=1&fetch_child=1`);
    const payload = (await response.json()) as { errcode?: number; errmsg?: string; userlist?: Array<{ userid: string; name?: string; department?: number[] }> };
    if (!response.ok || payload.errcode !== 0) throw new Error(`企业微信通讯录同步失败：${payload.errmsg ?? response.status}`);

    let created = 0;
    let updated = 0;
    for (const item of payload.userlist ?? []) {
      const existing = await this.prisma.member.findFirst({ where: { orgId, wecomUserid: item.userid } });
      if (existing) {
        await this.prisma.member.update({
          where: { id: existing.id },
          data: { displayName: item.name ?? existing.displayName, status: "active" }
        });
        updated += 1;
      } else {
        await this.prisma.member.create({
          data: {
            id: `wecom_${item.userid}`,
            orgId,
            displayName: item.name ?? item.userid,
            department: item.department?.join(","),
            role: MemberRole.Employee,
            status: "active",
            wecomUserid: item.userid,
            externalId: item.userid
          }
        });
        created += 1;
      }
    }

    const totalLocalMembers = await this.prisma.member.count({ where: { orgId } });
    return { mode: "wecom_api", totalLocalMembers, created, updated, message: "企业微信通讯录同步完成。" };
  }

  private async fetchAccessToken() {
    const corpId = this.config?.get<string>("WECOM_CORP_ID");
    const secret = this.config?.get<string>("WECOM_APP_SECRET");
    if (!corpId || !secret) throw new Error("缺少 WECOM_CORP_ID 或 WECOM_APP_SECRET");
    const response = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`);
    const payload = (await response.json()) as { errcode?: number; errmsg?: string; access_token?: string };
    if (!response.ok || payload.errcode !== 0 || !payload.access_token) throw new Error(`企业微信 access_token 获取失败：${payload.errmsg ?? response.status}`);
    return payload.access_token;
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
