import { spawnSync } from "node:child_process";

function runPrismaCommand(args) {
  const result = spawnSync("node", ["node_modules/prisma/build/index.js", ...args], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`prisma ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
}

const defaultActivityContent = [
  "活动名称：夏季 21 天运动打卡",
  "活动内容：每天完成一次运动打卡，打卡必须包含文字内容和运动图片。",
  "打卡要求：只有图片时可以由 AI 识别生成待确认记录；有文字和图片时优先使用文字内容解析。",
  "排行榜规则：支持按打卡次数、运动时长、消耗能量查看排行榜。",
  "隐私边界：群内提醒不公开未打卡成员名单，不展示原始图片和健康咨询原文。"
].join("\n");

function runPrismaDbPush() {
  runPrismaCommand(["db", "push", "--schema", "prisma/schema.prisma", "--accept-data-loss", "--skip-generate"]);
}

async function seedBaseData(prisma) {
  const org = await prisma.organization.upsert({
    where: { id: "org_demo" },
    update: {},
    create: {
      id: "org_demo",
      name: "Open Fit 示例企业",
      wecomCorpId: "mock_corp"
    }
  });

  await prisma.activity.upsert({
    where: { id: "act_demo" },
    update: {
      ruleJson: {
        content: defaultActivityContent
      }
    },
    create: {
      id: "act_demo",
      orgId: org.id,
      name: "夏季 21 天运动打卡",
      startAt: new Date("2026-07-01T00:00:00+08:00"),
      endAt: new Date("2026-07-31T23:59:59+08:00"),
      status: "active",
      reminderTime: "20:00",
      ruleJson: {
        content: defaultActivityContent
      }
    }
  });

  await prisma.weComConfig.createMany({
    data: [
      {
        id: "wecom_cfg_demo",
        orgId: org.id,
        botName: "Open Fit 示例群机器人",
        status: "pending"
      }
    ],
    skipDuplicates: true
  });

}

try {
  runPrismaDbPush();
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await seedBaseData(prisma);
  } finally {
    await prisma.$disconnect();
  }
  console.log("[database-bootstrap] schema and base data are ready");
} catch (error) {
  console.error("[database-bootstrap] failed", error);
  process.exitCode = 1;
}
