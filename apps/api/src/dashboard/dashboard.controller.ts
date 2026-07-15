import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { MemberRole, type DashboardSummary } from "@openfit/shared";
import { AllowRoles } from "../auth/role-guard.factory.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Controller("admin/dashboard")
export class DashboardController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get("summary")
  @UseGuards(AllowRoles(MemberRole.OrgAdmin))
  async getSummary(): Promise<DashboardSummary> {
    const activeActivity = await this.prisma.activity.findFirst({ where: { status: "active" } });
    if (!activeActivity) {
      return { todayCheckinCount: 0, checkinRate: 0, missingCount: 0, totalMemberCount: 0, totalDurationMin: 0, pendingIssueCount: 0 };
    }

    const memberCount = await this.prisma.member.count({ where: { orgId: activeActivity.orgId, status: "active" } });
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const submitted = await this.prisma.checkin.findMany({
      where: {
        activityId: activeActivity.id,
        status: { in: ["submitted", "corrected"] },
        submittedAt: { gte: start, lt: end }
      }
    });
    const totalDurationMin = submitted.reduce((sum, item) => sum + (item.durationMin ?? 0), 0);
    const todayCheckinCount = submitted.length;
    const missingCount = Math.max(memberCount - todayCheckinCount, 0);

    return {
      todayCheckinCount,
      checkinRate: memberCount === 0 ? 0 : Math.round((todayCheckinCount / memberCount) * 100),
      missingCount,
      totalMemberCount: memberCount,
      totalDurationMin,
      pendingIssueCount: await this.prisma.reminderTask.count({ where: { status: { in: ["failed", "manual"] } } })
    };
  }
}
