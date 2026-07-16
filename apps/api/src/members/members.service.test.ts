import { describe, expect, it } from "vitest";
import { MemberRole } from "@openfit/shared";
import { MembersService } from "./members.service.js";

describe("MembersService", () => {
  it("列出成员并暴露企业微信 userid 映射状态", async () => {
    const prisma = {
      member: {
        findMany: async () => [
          {
            id: "employee_demo",
            displayName: "员工小李",
            department: "产品部",
            role: MemberRole.Employee,
            status: "active",
            wecomUserid: "wecom_user_001",
            externalId: "employee_demo"
          },
          {
            id: "admin_demo",
            displayName: "活动管理员王姐",
            department: "行政部",
            role: MemberRole.ActivityAdmin,
            status: "active",
            wecomUserid: null,
            externalId: "admin_demo"
          }
        ]
      }
    };
    const service = new MembersService(prisma as never);

    const members = await service.list("org_demo");

    expect(members).toHaveLength(2);
    expect(members[0]).toMatchObject({ id: "employee_demo", wecomUserid: "wecom_user_001", mappingStatus: "bound" });
    expect(members[1]).toMatchObject({ id: "admin_demo", mappingStatus: "unbound" });
  });

  it("绑定成员企业微信 userid 并写入审计日志", async () => {
    const auditActions: string[] = [];
    const prisma = {
      member: {
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "employee_demo",
          displayName: "员工小李",
          department: "产品部",
          role: MemberRole.Employee,
          status: "active",
          externalId: "employee_demo",
          ...data
        })
      },
      auditLog: {
        create: async ({ data }: { data: { action: string } }) => {
          auditActions.push(data.action);
          return data;
        }
      }
    };
    const service = new MembersService(prisma as never);

    const member = await service.bindWeComUserid("org_admin_demo", "employee_demo", "wecom_new_001");

    expect(member.wecomUserid).toBe("wecom_new_001");
    expect(member.mappingStatus).toBe("bound");
    expect(auditActions).toEqual(["member.bind_wecom_userid"]);
  });

  it("filters active members who have not checked in today", async () => {
    const prisma = {
      activity: {
        findFirst: async () => ({ id: "act_demo", orgId: "org_demo", status: "active" })
      },
      member: {
        findMany: async () => [
          {
            id: "member_checked",
            displayName: "Checked",
            department: "Ops",
            role: MemberRole.Employee,
            status: "active",
            wecomUserid: "wecom_checked",
            externalId: "member_checked"
          },
          {
            id: "member_missing",
            displayName: "Missing",
            department: "Ops",
            role: MemberRole.Employee,
            status: "active",
            wecomUserid: "wecom_missing",
            externalId: "member_missing"
          }
        ]
      },
      checkin: {
        findMany: async () => [{ memberId: "member_checked" }]
      }
    };
    const service = new MembersService(prisma as never);

    const members = await service.list("org_demo", { missingToday: true, date: new Date("2026-07-14T08:00:00.000Z") });

    expect(members.map((member) => member.id)).toEqual(["member_missing"]);
  });

  it("returns one member with admin checkin history", async () => {
    const prisma = {
      member: {
        findFirst: async () => ({
          id: "member_demo",
          displayName: "Member Demo",
          department: "Ops",
          role: MemberRole.Employee,
          status: "active",
          wecomUserid: "wecom_demo",
          externalId: "member_demo"
        })
      },
      checkin: {
        findMany: async () => [
          {
            id: "chk_1",
            activityId: "act_demo",
            memberId: "member_demo",
            member: { displayName: "Member Demo" },
            status: "submitted",
            sportType: "walk",
            durationMin: 30,
            distanceKm: null,
            intensity: "moderate",
            calorieEstimate: null,
            submittedAt: new Date("2026-07-14T10:00:00.000Z"),
            createdAt: new Date("2026-07-14T09:55:00.000Z"),
            attachments: [
              {
                id: "att_1",
                checkinId: "chk_1",
                localPath: "wecom/org_demo/act_demo/chk_1/photo.jpg",
                mimeType: "image/jpeg",
                sizeBytes: 1024,
                status: "active",
                createdAt: new Date("2026-07-14T09:56:00.000Z")
              }
            ]
          }
        ]
      }
    };
    const service = new MembersService(prisma as never);

    const result = await service.getCheckinHistory("org_demo", "member_demo");

    expect(result.member.id).toBe("member_demo");
    expect(result.checkins).toHaveLength(1);
    expect(result.checkins[0]).toMatchObject({ id: "chk_1", memberName: "Member Demo" });
    expect(result.checkins[0].attachments?.[0]).toMatchObject({
      id: "att_1",
      localPath: "wecom/org_demo/act_demo/chk_1/photo.jpg",
      status: "active"
    });
  });
});
