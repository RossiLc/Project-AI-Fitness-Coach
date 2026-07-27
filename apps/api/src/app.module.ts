import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ActivitiesModule } from "./activities/activities.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CheckinsModule } from "./checkins/checkins.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { FilesModule } from "./files/files.module.js";
import { GroupsModule } from "./groups/groups.module.js";
import { HealthController } from "./health/health.controller.js";
import { MembersModule } from "./members/members.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { PushCampaignsModule } from "./push-campaigns/push-campaigns.module.js";
import { RemindersModule } from "./reminders/reminders.module.js";
import { WeComModule } from "./wecom/wecom.module.js";
import { AiModule } from "./ai/ai.module.js";
import { AuditModule } from "./audit/audit.module.js";
import { LeaderboardsModule } from "./leaderboards/leaderboards.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    PrismaModule,
    AuthModule,
    MembersModule,
    ActivitiesModule,
    CheckinsModule,
    LeaderboardsModule,
    DashboardModule,
    RemindersModule,
    PushCampaignsModule,
    AiModule,
    AuditModule,
    FilesModule,
    GroupsModule,
    WeComModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
