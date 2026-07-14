import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "org_demo" },
    update: {},
    create: {
      id: "org_demo",
      name: "Open Fit 示例企业",
      wecomCorpId: "mock_corp"
    }
  });

  await prisma.member.upsert({
    where: { id: "employee_demo" },
    update: { wecomUserid: "wecom_user_001" },
    create: {
      id: "employee_demo",
      orgId: org.id,
      displayName: "员工小李",
      department: "产品部",
      role: "employee",
      externalId: "employee_demo",
      wecomUserid: "wecom_user_001"
    }
  });
  await prisma.member.upsert({
    where: { id: "admin_demo" },
    update: { wecomUserid: "wecom_admin_001" },
    create: {
      id: "admin_demo",
      orgId: org.id,
      displayName: "活动管理员王姐",
      department: "行政部",
      role: "activity_admin",
      externalId: "admin_demo",
      wecomUserid: "wecom_admin_001"
    }
  });
  await prisma.member.upsert({
    where: { id: "org_admin_demo" },
    update: { wecomUserid: "wecom_org_admin_001" },
    create: {
      id: "org_admin_demo",
      orgId: org.id,
      displayName: "企业管理员老周",
      department: "IT 部",
      role: "org_admin",
      externalId: "org_admin_demo",
      wecomUserid: "wecom_org_admin_001"
    }
  });

  const activity = await prisma.activity.upsert({
    where: { id: "act_demo" },
    update: {},
    create: {
      id: "act_demo",
      orgId: org.id,
      name: "夏季 21 天运动打卡",
      startAt: new Date("2026-07-01T00:00:00+08:00"),
      endAt: new Date("2026-07-31T23:59:59+08:00"),
      status: "active",
      reminderTime: "20:00",
      ruleJson: {
        ranking: ["checkin_days", "duration_min"],
        makeupWindowDays: 1
      }
    }
  });

  await prisma.weComConfig.createMany({
    data: [
      {
        id: "wecom_cfg_demo",
        orgId: org.id,
        botName: "Open Fit 示例群机器人",
        status: process.env.WECOM_MOCK_MODE === "false" ? "pending" : "mock",
        webhookUrl: process.env.WECOM_BOT_WEBHOOK_URL || null
      }
    ],
    skipDuplicates: true
  });

  await prisma.reminderTask.createMany({
    data: [
      {
        id: "reminder_demo_manual",
        activityId: activity.id,
        memberId: "employee_demo",
        remindDate: new Date("2026-07-10T20:00:00+08:00"),
        channel: "web_manual",
        status: "manual",
        lastError: "自建应用消息未接入，第一阶段保留为人工处理任务"
      }
    ],
    skipDuplicates: true
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
