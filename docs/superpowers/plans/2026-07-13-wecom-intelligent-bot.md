# WeCom Intelligent Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现企业微信智能机器人第一条闭环：群内 @ 一个 Open Fit 机器人即可完成今日打卡确认和 AI 健身教练安全回复。

**Architecture:** 用户侧保持一个智能机器人入口，后端拆成入站控制器、意图路由、打卡编排、健康安全模板四层。第一阶段使用开发态 JSON 回调和规则路由，后续替换企业微信生产验签、加解密和真实 AI adapter。

**Tech Stack:** NestJS、TypeScript、Prisma、Vitest、PostgreSQL、现有 `@openfit/shared` 契约。

## Global Constraints

- 所有新增项目文档与 OpenSpec 产物使用中文。
- 企业微信密钥、token、webhook URL 不得提交到仓库。
- 用户侧只暴露一个“Open Fit 健身教练”智能机器人。
- 群内回复不得公开未打卡名单、健康咨询原文、敏感备注或他人打卡详情。
- 高风险健康问题必须拒绝诊断、治疗、处方和疾病管理结论。
- 第一阶段智能机器人入站接口允许 mock JSON；生产回调验签与加解密作为后续任务。

---

### Task 1: 共享契约与意图枚举

**Files:**
- Modify: `packages/shared/src/status.ts`
- Modify: `packages/shared/src/contracts.ts`
- Test: `packages/shared/src/status.test.ts`

**Interfaces:**
- Produces: `BotIntent`
- Produces: `WeComBotEventRequest`
- Produces: `WeComBotEventResponse`

- [ ] **Step 1: Write the failing test**

```ts
expect(BotIntent.CheckinRecord).toBe("checkin_record");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @openfit/shared test`

- [ ] **Step 3: Add enum and DTO contracts**

Add `BotIntent` and request/response interfaces with `messageId`、`fromUserId`、`text`、`chatId`、`replyType`、`intent`、`checkinId?`。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @openfit/shared test`

### Task 2: 意图路由与健康安全模板

**Files:**
- Create: `apps/api/src/wecom/bot-intent-router.service.ts`
- Create: `apps/api/src/wecom/coach-safety.service.ts`
- Test: `apps/api/src/wecom/bot-intent-router.service.test.ts`
- Test: `apps/api/src/wecom/coach-safety.service.test.ts`

**Interfaces:**
- Produces: `BotIntentRouterService.detect(text: string): BotIntent`
- Produces: `CoachSafetyService.buildReply(text: string): { riskLevel: "normal" | "escalate"; text: string }`

- [ ] **Step 1: Write failing router tests**

Test “确认” => `checkin_confirm`，“跑步30分钟” => `checkin_record`，“我膝盖不舒服怎么练” => `coach_advice`。

- [ ] **Step 2: Write failing safety tests**

Test “胸痛还能跑步吗” returns `escalate` and contains “专业帮助”。

- [ ] **Step 3: Implement minimal router and safety service**

Use deterministic keyword rules, no external AI calls.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @openfit/api test -- bot-intent-router coach-safety`

### Task 3: 智能机器人入站服务

**Files:**
- Create: `apps/api/src/wecom/wecom-bot.service.ts`
- Test: `apps/api/src/wecom/wecom-bot.service.test.ts`
- Modify: `apps/api/src/checkins/checkins.service.ts`

**Interfaces:**
- Produces: `WeComBotService.handleEvent(body: WeComBotEventRequest): Promise<WeComBotEventResponse>`
- Produces: `CheckinsService.submitLatestRecognized(user: CurrentUser): Promise<Checkin>`

- [ ] **Step 1: Write failing service tests**

Test unknown userid returns binding prompt; checkin text creates recognized reply; confirm submits latest recognized checkin.

- [ ] **Step 2: Add `submitLatestRecognized` test**

Test latest recognized checkin is submitted, missing recognized checkin returns stable error.

- [ ] **Step 3: Implement minimal service**

Map `fromUserId` to `members.wecomUserid`，call router, checkin service and safety service.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @openfit/api test -- wecom-bot`

### Task 4: API 入站入口

**Files:**
- Modify: `apps/api/src/wecom/wecom-stream-bot.service.ts`
- Modify: `apps/api/src/wecom/wecom.module.ts`
- Test: `apps/api/src/wecom/wecom-stream-bot.service.test.ts`

**Interfaces:**
- Produces: `POST /api/admin/wecom/test-message`
- Produces: SDK 长连接入站适配，不暴露智能机器人 URL 回调入口

- [ ] **Step 1: Write failing stream adapter test**

Fake SDK `message.text` / `message.image` / `message.mixed` 事件并断言转换为 `WeComBotEventRequest`。

- [ ] **Step 2: Add stream adapter**

Keep admin test-message route unchanged; add SDK long-connection adapter under same module.

- [ ] **Step 3: Run targeted tests**

Run: `pnpm --filter @openfit/api test -- wecom`

### Task 5: 文档、任务状态和验证

**Files:**
- Modify: `openspec/changes/prepare-open-fit-mvp/tasks.md`
- Modify: `docs/知识库/业务规范.md`
- Modify: `docs/知识库/基础架构.md`

**Interfaces:**
- Produces: 可复用启动与验证说明。

- [ ] **Step 1: Run full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm openspec:validate`

- [ ] **Step 2: Smoke test stream adapter**

Run targeted stream adapter tests for checkin and coach safety reply.

- [ ] **Step 3: Update task checkboxes**

Mark 4.6、4.7、4.8、4.9 complete only after verification evidence exists.

- [ ] **Step 4: Knowledge base writeback**

Record single-bot architecture and privacy boundary in the knowledge base.
