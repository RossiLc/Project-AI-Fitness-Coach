# WeCom Two-Bot Checkin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将员工侧企业微信入口改为“打卡助手 + AI 教练”双机器人，并实现打卡图片必填、图片-only AI 识别待确认。

**Architecture:** 企业微信入站契约通过 `botRole` 或 `botId` 区分机器人职责。打卡助手只创建和提交打卡，AI 教练只处理咨询、活动和排行榜查询。图片识别通过现有 OpenAI-compatible AI provider 扩展，mock 模式返回稳定演示结果。

**Tech Stack:** Vue 3、TypeScript、Node.js、NestJS、Prisma、PostgreSQL、Redis/BullMQ、OpenAI-compatible GPT-5.5 adapter、本地文件存储。

## Global Constraints

- 所有项目自写文档使用中文。
- 新业务行为必须先写失败测试，再实现。
- 普通员工不使用 Web 作为主入口。
- 打卡必须包含文字内容和图片凭证；图片-only 可由 AI 生成文字识别结果，但仍需用户确认。
- AI 教练不得创建打卡记录。
- 真实 key、token、webhook 不得提交到仓库。

---

### Task 1: 共享契约与配置

**Files:**
- Modify: `packages/shared/src/contracts.ts`
- Modify: `.env.example`
- Test: `packages/shared/src/status.test.ts`

**Interfaces:**
- Produces: `WeComBotRole = "checkin" | "coach"`
- Produces: `WeComBotEventRequest.botRole?: WeComBotRole`
- Produces: `WeComBotEventRequest.botId?: string`
- Produces env: `WECOM_CHECKIN_BOT_ID`, `WECOM_COACH_BOT_ID`

- [ ] Add a failing shared test asserting bot role literals are exported.
- [ ] Run `pnpm --filter @openfit/shared test` and verify failure.
- [ ] Add the shared contract types and env placeholders.
- [ ] Run `pnpm --filter @openfit/shared test` and verify pass.

### Task 2: AI 图片打卡识别 adapter

**Files:**
- Modify: `apps/api/src/ai/ai-provider.service.ts`
- Modify: `apps/api/src/ai/ai-checkin-parser.service.ts`
- Test: `apps/api/src/ai/ai-checkin-parser.service.test.ts`

**Interfaces:**
- Produces: `AiCheckinParserService.parseImage(input): Promise<RecognitionResultDto>`
- Consumes: `WeComBotAttachment[]`

- [ ] Add a failing test for image-only parsing returning `sportType`, `durationMin`, `confidence`, and a notice containing “图片识别”。
- [ ] Run `pnpm --filter @openfit/api test -- ai-checkin-parser.service.test.ts` and verify failure.
- [ ] Implement mock image parse and OpenAI-compatible model path.
- [ ] Run the same test and verify pass.

### Task 3: 打卡提交图片必填

**Files:**
- Modify: `apps/api/src/checkins/checkins.service.ts`
- Test: `apps/api/src/checkins/checkins.service.test.ts`

**Interfaces:**
- Produces: `submitLatestRecognized(user)` rejects latest recognized checkin without active attachment.
- Consumes: `prisma.attachment.count({ where: { checkinId, status: "active" } })`

- [ ] Add a failing test proving latest recognized checkin without attachment is not submitted.
- [ ] Run `pnpm --filter @openfit/api test -- checkins.service.test.ts` and verify failure.
- [ ] Add attachment count check before submit.
- [ ] Run the same test and verify pass.

### Task 4: 双机器人入站路由

**Files:**
- Modify: `apps/api/src/wecom/wecom-bot.service.ts`
- Test: `apps/api/src/wecom/wecom-bot.service.test.ts`

**Interfaces:**
- Produces: checkin bot `text-only` -> prompt image, no checkin.
- Produces: checkin bot `mixed` -> text parse + attachment.
- Produces: checkin bot `image-only` -> AI image parse + attachment.
- Produces: coach bot never creates checkin.

- [ ] Add failing tests for the four behaviors above.
- [ ] Run `pnpm --filter @openfit/api test -- wecom-bot.service.test.ts` and verify failure.
- [ ] Inject `AiCheckinParserService` into `WeComBotService` and implement branch-by-role.
- [ ] Run the same test and verify pass.

### Task 5: OpenSpec 与知识库回写

**Files:**
- Modify: `docs/知识库/业务规范.md`
- Modify: `docs/知识库/基础架构.md`
- Modify: `openspec/changes/prepare-open-fit-mvp/design.md`
- Modify: `openspec/changes/prepare-open-fit-mvp/plan.md`
- Modify: `openspec/changes/prepare-open-fit-mvp/tasks.md`

**Interfaces:**
- Produces: OpenSpec tasks for 11.x double-bot checkin increment.

- [ ] Document two-bot decision and image-required checkin rule.
- [ ] Add OpenSpec task items 11.1-11.7.
- [ ] Run `pnpm openspec:validate`.

### Task 6: Full verification

**Files:**
- No production files.

**Interfaces:**
- Produces: fresh verification evidence.

- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.
- [ ] Run `pnpm openspec:validate`.
- [ ] Mark OpenSpec 11.x tasks complete only after verification passes.
