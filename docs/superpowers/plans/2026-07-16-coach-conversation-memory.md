# AI 教练多轮会话 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for service behavior and superpowers:verification-before-completion before claiming completion. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让企业微信 `Open Fit AI 教练` 支持按 `chatid + userid` 隔离的多轮追问，并通过最近消息窗口加滚动摘要保持上下文连续。

**Architecture:** 在 PostgreSQL 中新增 `CoachConversation` 和 `CoachConversationMessage`，由 `CoachConversationService` 负责查找会话、读取最近 10 条消息、维护摘要和保存问答。`WeComBotService` 在 AI 教练路径中读取上下文并调用 `AiProviderService.generateCoachAdviceWithMessages()`，安全围栏仍然在输入和输出两端执行。

**Tech Stack:** NestJS、Prisma、PostgreSQL、Vitest、OpenAI-compatible chat completions。

## Global Constraints

- 普通员工仍然只通过企业微信机器人使用系统，Web 不新增员工聊天入口。
- 多轮上下文只对 `Open Fit AI 教练` 生效，`Open Fit 打卡助手` 不使用聊天上下文。
- 群聊上下文必须按 `orgId + chatId + wecomUserid` 隔离；单聊按 `orgId + wecomUserid` 隔离。
- 安全围栏在读取上下文后、调用模型前校验当前输入；模型输出仍需再次校验。
- 不保存被安全围栏拦截的完整高风险原文，只允许记录 hash/摘要类审计信息。

---

### Task 1: 数据模型与 Prisma Client

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `packages/shared/src/contracts.ts` if public DTO is needed later

**Interfaces:**
- Produces: `CoachConversation` model
- Produces: `CoachConversationMessage` model

- [ ] Add `CoachConversation` with `orgId`, `memberId`, `wecomUserid`, `chatId`, `channel`, `summary`, `lastMessageAt`.
- [ ] Add `CoachConversationMessage` with `conversationId`, `role`, `content`, `contentHash`, `createdAt`.
- [ ] Add indexes for conversation lookup and message ordering.
- [ ] Run `pnpm --filter @openfit/api dev:db:generate`.

### Task 2: 会话服务 TDD

**Files:**
- Create: `apps/api/src/ai/coach-conversation.service.ts`
- Create: `apps/api/src/ai/coach-conversation.service.test.ts`
- Modify: `apps/api/src/ai/ai.module.ts`
- Modify: `apps/api/src/wecom/wecom.module.ts`

**Interfaces:**
- Produces: `buildContext(input): Promise<CoachConversationContext>`
- Produces: `appendExchange(input): Promise<void>`
- Produces: `clearConversation(input): Promise<boolean>`

- [ ] Write failing tests for lookup isolation by `chatId + wecomUserid`.
- [ ] Write failing tests for recent message window.
- [ ] Write failing tests for summary update after message count exceeds 10.
- [ ] Implement minimal service.
- [ ] Run targeted tests.

### Task 3: AI Provider 消息输入

**Files:**
- Modify: `apps/api/src/ai/ai-provider.service.ts`
- Modify: `apps/api/src/ai/ai-provider.service.test.ts`

**Interfaces:**
- Produces: `generateCoachAdviceWithMessages(messages)`

- [ ] Write failing test that provider sends system prompt, conversation messages, and current question to `/chat/completions`.
- [ ] Implement the new method while keeping `generateCoachAdvice(question)` as wrapper.
- [ ] Run targeted tests.

### Task 4: 企业微信 AI 教练接入上下文

**Files:**
- Modify: `apps/api/src/wecom/wecom-bot.service.ts`
- Modify: `apps/api/src/wecom/wecom-bot.service.test.ts`

**Interfaces:**
- Consumes: `CoachConversationService`
- Consumes: `AiProviderService.generateCoachAdviceWithMessages()`

- [ ] Write failing test for A 问题后 B 追问携带上一轮上下文。
- [ ] Write failing test for different users in same group不共享上下文。
- [ ] Write failing test for `清空上下文` reset.
- [ ] Implement coach path context loading/saving/reset.
- [ ] Run targeted tests.

### Task 5: OpenSpec 与知识库回写

**Files:**
- Modify: `openspec/changes/prepare-open-fit-mvp/tasks.md`
- Modify: `openspec/changes/prepare-open-fit-mvp/design.md`
- Modify: `docs/知识库/业务规范.md`
- Modify: `docs/知识库/基础架构.md`

**Interfaces:**
- Produces: stable project rule for AI 教练多轮会话。

- [ ] Add OpenSpec task section for coach conversation memory.
- [ ] Add design note for short-term window + rolling summary.
- [ ] Add knowledge-base rule for privacy and context isolation.

### Task 6: Verification

- [ ] `pnpm --filter @openfit/api test -- coach-conversation ai-provider wecom-bot`
- [ ] `pnpm --filter @openfit/api typecheck`
- [ ] `pnpm openspec:validate`
