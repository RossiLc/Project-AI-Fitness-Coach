import { Inject, Injectable, Optional } from "@nestjs/common";
import { MemberRole, type ImportGroupMembersByNameResult, type WeComDirectoryMemberDto, type WeComGroupDto } from "@openfit/shared";
import { createHash, randomBytes } from "node:crypto";
import { ApiException } from "../common/api-response.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { WeComDirectoryService } from "./wecom-directory.service.js";

type GroupRow = {
  id: string;
  orgId: string;
  name: string;
  chatId: string | null;
  bindCode: string;
  status: string;
  lastSeenAt: Date | null;
  createdAt: Date;
  _count?: { members: number };
};

@Injectable()
export class GroupsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(WeComDirectoryService) private readonly directory?: WeComDirectoryService
  ) {}

  async list(orgId: string): Promise<WeComGroupDto[]> {
    const groups = await this.prisma.weComGroup.findMany({
      where: { orgId, status: { not: "archived" } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { members: true } } }
    });
    return groups.map(toGroupDto);
  }

  async create(orgId: string, name: string): Promise<WeComGroupDto> {
    const trimmed = name.trim();
    if (!trimmed) throw new ApiException("WECOM_GROUP_NAME_REQUIRED", "群名称不能为空", 400);
    const group = await this.prisma.weComGroup.create({
      data: {
        orgId,
        name: trimmed,
        bindCode: this.createBindCode()
      },
      include: { _count: { select: { members: true } } }
    });
    return toGroupDto(group);
  }

  async bindFromWeComMessage(orgId: string, chatId: string | undefined, fromUserId: string, text: string): Promise<WeComGroupDto | null> {
    if (!chatId?.trim()) return null;
    const bindCode = this.extractBindCode(text);
    if (!bindCode) {
      await this.touchKnownGroup(orgId, chatId, fromUserId);
      return null;
    }

    const pending = await this.prisma.weComGroup.findFirst({ where: { orgId, bindCode, status: { not: "archived" } } });
    if (!pending) return null;

    const group = await this.prisma.weComGroup.update({
      where: { id: pending.id },
      data: { chatId, status: "active", lastSeenAt: new Date() },
      include: { _count: { select: { members: true } } }
    });
    await this.observeMember(orgId, group.id, fromUserId, "observed");
    return toGroupDto(group);
  }

  async observeMemberByChat(orgId: string, chatId: string | undefined, wecomUserid: string): Promise<void> {
    if (!chatId?.trim() || !wecomUserid.trim()) return;
    const group = await this.prisma.weComGroup.findFirst({ where: { orgId, chatId, status: "active" } });
    if (!group) return;
    await this.prisma.weComGroup.update({ where: { id: group.id }, data: { lastSeenAt: new Date() } });
    await this.observeMember(orgId, group.id, wecomUserid, "observed");
  }

  async importMembersByNames(orgId: string, groupId: string, namesText: string): Promise<ImportGroupMembersByNameResult> {
    const group = await this.prisma.weComGroup.findFirst({ where: { id: groupId, orgId } });
    if (!group) throw new ApiException("WECOM_GROUP_NOT_FOUND", "企业微信群不存在", 404);

    const names = parseNames(namesText);
    const directory = await this.directory?.listMembers();
    const byName = new Map<string, WeComDirectoryMemberDto[]>();
    for (const item of directory ?? []) {
      const list = byName.get(item.name) ?? [];
      list.push(item);
      byName.set(item.name, list);
    }

    const result: ImportGroupMembersByNameResult = { groupId, matched: [], duplicates: [], notFound: [] };
    for (const name of names) {
      const candidates = byName.get(name) ?? [];
      if (candidates.length === 0) {
        result.notFound.push(name);
        continue;
      }
      if (candidates.length > 1) {
        result.duplicates.push({ name, candidates });
        continue;
      }

      const directoryMember = candidates[0]!;
      const member = await this.upsertMemberFromDirectory(orgId, directoryMember);
      await this.linkGroupMember(groupId, member.id, directoryMember, "address_book");
      result.matched.push({ name, userid: directoryMember.userid, memberId: member.id, department: directoryMember.department });
    }
    return result;
  }

  private async touchKnownGroup(orgId: string, chatId: string, fromUserId: string): Promise<void> {
    const group = await this.prisma.weComGroup.findFirst({ where: { orgId, chatId, status: "active" } });
    if (!group) return;
    await this.prisma.weComGroup.update({ where: { id: group.id }, data: { lastSeenAt: new Date() } });
    await this.observeMember(orgId, group.id, fromUserId, "observed");
  }

  private async observeMember(orgId: string, groupId: string, wecomUserid: string, source: string): Promise<void> {
    if (!wecomUserid.trim()) return;
    const existing = await this.prisma.member.findFirst({ where: { orgId, wecomUserid } });
    const member =
      existing ??
      (await this.prisma.member.create({
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
      }));
    await this.linkGroupMember(groupId, member.id, { userid: wecomUserid, name: member.displayName, department: member.department ?? undefined }, source);
  }

  private async upsertMemberFromDirectory(orgId: string, item: WeComDirectoryMemberDto) {
    const existing = await this.prisma.member.findFirst({ where: { orgId, wecomUserid: item.userid } });
    if (existing) {
      return this.prisma.member.update({
        where: { id: existing.id },
        data: { displayName: item.name, department: item.department, status: "active" }
      });
    }
    return this.prisma.member.create({
      data: {
        id: `wecom_${createHash("sha1").update(item.userid).digest("hex").slice(0, 16)}`,
        orgId,
        displayName: item.name,
        department: item.department,
        role: MemberRole.Employee,
        status: "active",
        wecomUserid: item.userid,
        externalId: item.userid
      }
    });
  }

  private async linkGroupMember(groupId: string, memberId: string, item: WeComDirectoryMemberDto, source: string): Promise<void> {
    await this.prisma.weComGroupMember.upsert({
      where: { groupId_memberId: { groupId, memberId } },
      update: {
        displayName: item.name,
        department: item.department,
        wecomUserid: item.userid,
        source,
        status: "active",
        verifiedAt: source === "observed" ? new Date() : undefined
      },
      create: {
        groupId,
        memberId,
        wecomUserid: item.userid,
        displayName: item.name,
        department: item.department,
        source,
        status: "active",
        verifiedAt: source === "observed" ? new Date() : undefined
      }
    });
  }

  private extractBindCode(text: string): string | null {
    const match = text.match(/OF-[A-Z0-9]{6}/i);
    return match?.[0].toUpperCase() ?? null;
  }

  private createBindCode(): string {
    return `OF-${randomBytes(3).toString("hex").toUpperCase()}`;
  }
}

function parseNames(value: string): string[] {
  return [...new Set(value.split(/[;；,，\n\r\t ]+/).map((item) => item.trim()).filter(Boolean))];
}

function toGroupDto(group: GroupRow): WeComGroupDto {
  return {
    id: group.id,
    orgId: group.orgId,
    name: group.name,
    chatId: group.chatId ?? undefined,
    bindCode: group.bindCode,
    status: group.status as WeComGroupDto["status"],
    memberCount: group._count?.members ?? 0,
    lastSeenAt: group.lastSeenAt?.toISOString(),
    createdAt: group.createdAt.toISOString()
  };
}
