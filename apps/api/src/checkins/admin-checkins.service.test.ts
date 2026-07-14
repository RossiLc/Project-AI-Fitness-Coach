import { describe, expect, it } from "vitest";
import { CheckinStatus, MemberRole, type CurrentUser } from "@openfit/shared";
import { AdminCheckinsService } from "./admin-checkins.service.js";

describe("AdminCheckinsService", () => {
  const admin: CurrentUser = {
    id: "admin_demo",
    orgId: "org_demo",
    displayName: "活动管理员王姐",
    role: MemberRole.ActivityAdmin
  };

  it("作废打卡并写入审计日志", async () => {
    const auditActions: string[] = [];
    const prisma = {
      checkin: {
        findFirst: async () => ({ id: "chk_bad", activityId: "act_demo", status: CheckinStatus.Submitted }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "chk_bad", ...data })
      },
      auditLog: {
        create: async ({ data }: { data: { action: string } }) => {
          auditActions.push(data.action);
          return { id: "audit_1", ...data };
        }
      }
    };
    const service = new AdminCheckinsService(prisma as never);

    const result = await service.invalidate(admin, "chk_bad", "截图与运动内容不符");

    expect(result.status).toBe(CheckinStatus.Invalid);
    expect(auditActions).toEqual(["checkin.invalidate"]);
  });

  it("restores an invalid checkin to its previous status and writes audit log", async () => {
    const auditActions: string[] = [];
    const prisma = {
      checkin: {
        findFirst: async () => ({ id: "chk_bad", activityId: "act_demo", status: CheckinStatus.Invalid }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "chk_bad", ...data })
      },
      auditLog: {
        findFirst: async () => ({ detailJson: { previousStatus: CheckinStatus.Corrected } }),
        create: async ({ data }: { data: { action: string } }) => {
          auditActions.push(data.action);
          return { id: "audit_restore", ...data };
        }
      }
    };
    const service = new AdminCheckinsService(prisma as never);

    const result = await service.restore(admin, "chk_bad");

    expect(result.status).toBe(CheckinStatus.Corrected);
    expect(auditActions).toEqual(["checkin.restore"]);
  });
});
