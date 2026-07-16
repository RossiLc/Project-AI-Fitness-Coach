# Open Fit Phase 1 Runnable Framework Implementation Plan

## Plan Update: 方案 B 单管理员 Web 工作台

当前实施边界调整为：普通员工不使用 Web 平台，员工入口只保留企业微信群内的 Open Fit 打卡助手和 Open Fit AI 教练；Web 只作为单管理员运营后台。后台工作路径是“群管理 -> 选择当前群 -> 运营看板 / 成员管理 / 活动配置 / 排行榜管理”。后台只保留群管理、运营看板、成员管理、活动配置、排行榜管理五个模块。

本轮实现范围：
- 群管理支持新增群、生成绑定口令、保存智能机器人消息中的 `chatid`、选择当前群和中文名导入群成员。
- 运营看板按当前群展示今日打卡人数、未打卡人数、总人数和打卡率。
- 成员管理按当前群支持成员列表、今日未打卡筛选、成员打卡明细穿透、作废和恢复打卡。
- 成员管理提供提醒未打卡按钮，通过当前群绑定的打卡助手长连接推送到群里，并 @ 未打卡成员 userid。
- 活动配置按当前群维护活动规则和 AI 教练活动知识来源；新增活动默认成为该群 active 活动。
- 排行榜管理按当前群展示打卡次数、运动时长和消耗能量排行榜，并支持手动重建。
- 移除主导航中的员工调试入口、企业微信配置入口、角色权限入口和系统设置入口。

> **For agentic workers:** REQUIRED SUB-SKILL: Use `using-git-worktrees` before implementation if the current workspace is dirty, `test-driven-development` for business logic, `subagent-driven-development` or `executing-plans` for task execution, and `verification-before-completion` before claiming completion.

**Goal:** 第一阶段交付一个可本地运行、可简单体验、主体框架完整的 Open Fit 代码骨架，能够演示 Web 工作台、后端模块边界、worker 队列、文本打卡体验和企业微信群机器人测试发送。

**Architecture:** 采用 pnpm monorepo，包含 `apps/web`、`apps/api`、`apps/worker`、`packages/shared` 和 `infra/docker`。后端为 Node.js + NestJS 模块化单体，worker 复用 NestJS 模块和 BullMQ，Web 为 Vue 3 + Vite + TypeScript 工作台。第一阶段优先打通纵向链路，真实企业微信 OAuth、自建应用消息、AI 模型和图片识别作为后续阶段增强。

**Tech Stack:** Vue 3、Vite、TypeScript、Node.js、NestJS、PostgreSQL、Redis、BullMQ、Prisma、本地磁盘存储、Docker Compose、pnpm workspace。

## Global Constraints

- 所有项目自写文档、OpenSpec 产物和新增说明使用中文。
- 企业微信 Bot Secret、应用 secret、access token 和 AI API key 不得提交到仓库。
- 第一阶段默认使用企业微信智能机器人 SDK 长连接；后台群推送通过打卡助手 `sendMessage` 主动发送，目标群 `chatid` 来自群内 @ 机器人消息。
- AI 识别结果必须由员工确认或修正后才能计入统计；第一阶段可使用规则解析器替代真实 AI。
- 群提醒必须发送到管理员当前选择的企业微信群，并基于当前群成员计算未打卡名单；是否 @ 成员由当前产品策略决定，目前实现为 @ 未打卡成员 userid。
- 本地上传目录不得通过静态目录直接公开，必须预留后端鉴权访问路径。
- 图片识别、真实企业微信 OAuth、自建应用个人提醒、完整 AI 健康咨询不作为第一阶段阻塞项。

---

## Scope

第一阶段做：

- 创建可运行 monorepo 工程骨架。
- 创建 Vue Web 工作台主体页面、角色导航和可体验文本打卡闭环。
- 创建 NestJS API 模块边界、健康检查、mock auth、活动/打卡/提醒/企业微信基础 API。
- 创建 Prisma schema、数据库连接、seed 数据和本地文件存储目录。
- 创建 worker、BullMQ 队列和企业微信消息发送 job。
- 支持企业微信智能机器人长连接测试发送；未捕获目标群 `chatid` 时返回明确错误并提示先在群里 @ 打卡助手。
- 提供 Docker Compose 或等价脚本启动 PostgreSQL、Redis、API、worker、Web。
- 提供 lint、类型检查、测试、OpenSpec 校验和冒烟验证。

第一阶段不做：

- 不实现生产级企业微信 OAuth、通讯录同步和自建应用个人消息。
- AI 教练保留真实 AI Provider 调用链路；未配置 URL/key 时返回未配置提示，不提供模拟 AI 回复。打卡解析和图片识别可保留开发降级逻辑。
- 不实现图片识别，只创建本地文件存储和访问控制骨架。
- 不实现复杂排行榜规则、积分商城、团队赛和奖励兑换。
- 不实现完整权限后台，只使用 mock 角色切换和守卫占位。

## Current Repository State

当前仓库尚无应用代码目录，只有 `docs/`、`openspec/`、`scripts/`、`.codex/skills/` 和项目入口文件。因此第一阶段需要从脚手架开始，但必须避免把 `.codex/skills/**` 纳入 TypeScript、lint、测试和打包范围。

## File Structure

第一阶段建议创建或修改：

- `package.json`：根脚本，统一 `dev`、`build`、`lint`、`typecheck`、`test`、`db:*`、`openspec:validate`。
- `pnpm-workspace.yaml`：声明 `apps/*`、`packages/*`。
- `tsconfig.base.json`：共享 TypeScript 配置，排除 `.codex/skills/**`、`docs/**`、`openspec/**`。
- `.editorconfig`：基础编辑规范。
- `.env.example`：所有必需环境变量示例，不包含真实密钥。
- `apps/api/`：NestJS API 服务。
- `apps/worker/`：NestJS worker 服务。
- `apps/web/`：Vue 3 工作台。
- `packages/shared/`：共享类型、状态枚举、API 契约和错误码。
- `infra/docker/docker-compose.yml`：PostgreSQL、Redis、API、worker、Web、本地存储挂载。
- `storage/uploads/.gitkeep`：本地上传目录占位。
- `docs/知识库/基础架构.md`、`docs/知识库/代码规范.md`：如第一阶段最终确认目录结构和运行命令，收尾时回写。

## Phase 1 Task Plan

### Task 1: Monorepo 与基础脚本

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.editorconfig`
- Modify: `.gitignore`
- Create: `.env.example`
- Create: `storage/uploads/.gitkeep`

**Interfaces:**
- Produces: 根脚本 `pnpm dev`、`pnpm build`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm openspec:validate`。
- Produces: 环境变量命名约定，供 API、worker、Web 和 Docker 使用。

**Steps:**

1. 创建 pnpm workspace，包含 `apps/*` 和 `packages/*`。
2. 在根 `package.json` 中声明脚本：
   - `dev`：并行启动 API、worker、Web。
   - `build`：构建 shared、api、worker、web。
   - `lint`：运行各包 lint。
   - `typecheck`：运行各包 TypeScript 检查。
   - `test`：运行各包测试。
   - `openspec:validate`：运行 `openspec validate prepare-open-fit-mvp`。
3. 在 `.gitignore` 中加入 `node_modules/`、`dist/`、`.env`、`storage/uploads/*`，保留 `storage/uploads/.gitkeep`。
4. 在 `.env.example` 中声明：
   - `DATABASE_URL`
   - `REDIS_URL`
   - `API_PORT`
   - `WEB_PORT`
   - `LOCAL_STORAGE_ROOT`
   - `WECOM_CHECKIN_BOT_ID`
   - `WECOM_CHECKIN_BOT_SECRET`
   - `WECOM_CHECKIN_BOT_ID`
   - `WECOM_CHECKIN_BOT_SECRET`
   - `WECOM_COACH_BOT_ID`
   - `WECOM_COACH_BOT_SECRET`
   - `WECOM_INTELLIGENT_BOT_WS_URL`
   - `WECOM_CORP_ID`
   - `WECOM_APP_SECRET`
   - `AI_BASE_URL`
   - `AI_API_KEY`
   - `AI_MODEL=gpt-5.5`
5. 验证：`pnpm -v` 可用；若不可用，在最终输出中说明需要安装 pnpm。

### Task 2: Shared 契约包

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/status.ts`
- Create: `packages/shared/src/errors.ts`
- Create: `packages/shared/src/contracts.ts`
- Create: `packages/shared/tsconfig.json`

**Interfaces:**
- Produces: `CheckinStatus`、`ReminderStatus`、`MemberRole`、`ApiErrorCode`。
- Produces: `RecognizeCheckinRequest`、`RecognizeCheckinResponse`、`SubmitCheckinRequest`、`WeComTestMessageRequest`、`DashboardSummary`。
- Consumed by: `apps/api`、`apps/worker`、`apps/web`。

**Steps:**

1. 定义状态枚举：
   - `draft`、`recognized`、`submitted`、`corrected`、`withdrawn`、`invalid`
   - `pending`、`eligible`、`sent`、`skipped`、`failed`、`manual`
   - `employee`、`activity_admin`、`org_admin`
2. 定义第一阶段 API DTO 类型，字段与 `design.md` 的契约保持一致。
3. 定义稳定错误码：
   - `ACTIVITY_NOT_ACTIVE`
   - `CHECKIN_ALREADY_SUBMITTED`
   - `CHECKIN_NOT_FOUND`
   - `WECOM_WEBHOOK_NOT_CONFIGURED`
   - `WECOM_SEND_FAILED`
   - `UNAUTHORIZED_ROLE`
4. 添加最小单元测试，验证状态枚举和错误码导出。
5. 验证：`pnpm --filter @openfit/shared test` 与 `pnpm --filter @openfit/shared typecheck` 通过。

### Task 3: API 服务骨架

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/config/config.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/common/http-exception.filter.ts`
- Create: `apps/api/src/common/api-response.ts`
- Create: `apps/api/test/health.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /api/health` 返回 `{ status, service, version }`。
- Produces: 全局错误响应 `{ error: { code, message, detail? } }`。

**Steps:**

1. 搭建 NestJS API 入口，统一 API 前缀为 `/api`。
2. 加载环境变量并校验必需配置。
3. 增加健康检查接口。
4. 增加全局异常过滤器，保证错误响应结构稳定。
5. 编写 e2e 测试，断言 `GET /api/health` 返回 200。
6. 验证：`pnpm --filter @openfit/api test` 通过。

### Task 4: Prisma 与种子数据

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/seed.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- Produces: Prisma models `Organization`、`Member`、`Activity`、`Checkin`、`RecognitionResult`、`WeComConfig`、`ReminderTask`、`AuditLog`。
- Produces: seed 数据：一个组织、三名成员、一个进行中活动、示例提醒任务。

**Steps:**

1. 建立 Prisma schema，第一阶段只建运行骨架必需表。
2. 添加索引：
   - `Member(orgId, wecomUserid)`
   - `Checkin(activityId, memberId, submittedAt)`
   - `ReminderTask(activityId, remindDate, status)`
3. 编写 seed 脚本：
   - 员工：`employee_demo`
   - 活动管理员：`admin_demo`
   - 企业管理员：`org_admin_demo`
4. 添加脚本：
   - `dev:db:generate`
   - `dev:db:push`
   - `dev:db:seed`
5. 验证：在本地 PostgreSQL 可用时运行 `pnpm dev:db:setup`。这些命令只用于本地开发；生产环境应使用迁移任务。

### Task 5: Mock Auth 与角色守卫

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/current-user.decorator.ts`
- Create: `apps/api/src/auth/mock-auth.guard.ts`
- Create: `apps/api/src/auth/me.controller.ts`
- Create: `apps/api/src/auth/roles.guard.ts`
- Create: `apps/api/test/auth.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /api/me?role=employee|activity_admin|org_admin`。
- Produces: `CurrentUser` 对象 `{ id, displayName, role, orgId }`。

**Steps:**

1. 当前 Web 工作台只保留单管理员视角，不再暴露员工/多角色切换配置。
2. 未传角色时默认员工。
3. 添加角色守卫占位，后续可替换为企业微信 OAuth。
4. 编写测试覆盖三类角色。
5. 验证：`pnpm --filter @openfit/api test -- auth` 通过。

### Task 6: 活动、仪表盘与提醒 API

**Files:**
- Create: `apps/api/src/activities/activities.module.ts`
- Create: `apps/api/src/activities/activities.controller.ts`
- Create: `apps/api/src/dashboard/dashboard.module.ts`
- Create: `apps/api/src/dashboard/dashboard.controller.ts`
- Create: `apps/api/src/reminders/reminders.module.ts`
- Create: `apps/api/src/reminders/reminders.controller.ts`
- Create: `apps/api/test/dashboard.e2e-spec.ts`

**Interfaces:**
- Produces: `GET /api/activities/current`
- Produces: `GET /api/admin/dashboard/summary`
- Produces: `GET /api/admin/reminders`

**Steps:**

1. 当前活动从 seed 数据读取；无活动时返回稳定空态。
2. dashboard summary 返回今日打卡人数、打卡率、未打卡人数、累计运动时长、待处理异常数。
3. reminders 返回 seed 或数据库中的提醒任务。
4. 管理接口使用角色守卫占位。
5. 编写 e2e 测试覆盖员工可读当前活动、管理员可读 dashboard。

### Task 7: 文本打卡体验闭环

**Files:**
- Create: `apps/api/src/checkins/checkins.module.ts`
- Create: `apps/api/src/checkins/checkins.controller.ts`
- Create: `apps/api/src/checkins/checkins.service.ts`
- Create: `apps/api/src/checkins/rule-recognizer.service.ts`
- Create: `apps/api/test/checkins.e2e-spec.ts`

**Interfaces:**
- Produces: `POST /api/checkins/recognize`
- Produces: `POST /api/checkins/:id/submit`
- Produces: `GET /api/checkins/mine`

**Steps:**

1. 规则解析器支持从文本中识别常见运动类型、分钟数和公里数。
2. `recognize` 创建 `recognized` 打卡和 `RecognitionResult`。
3. `submit` 将员工确认后的字段写入 `submitted`。
4. `mine` 返回当前 mock 用户的记录。
5. 编写测试：
   - “今天快走 40 分钟，大概 4 公里”生成待确认记录。
   - 提交后状态变为 `submitted`。
   - 重复提交同一记录返回稳定错误码。

### Task 8: 企业微信发送 API

**Files:**
- Create: `apps/api/src/wecom/wecom.module.ts`
- Create: `apps/api/src/wecom/wecom.controller.ts`
- Create: `apps/api/src/wecom/wecom.service.ts`
- Create: `apps/api/src/wecom/wecom-message.sender.ts`
- Create: `apps/api/test/wecom.e2e-spec.ts`

**Interfaces:**
- Produces: `POST /api/admin/wecom/test-message`
- Produces: `WeComMessageSender.sendMarkdown(text): Promise<SendResult>`。

**Steps:**

1. 读取最近捕获的打卡助手群 `chatid`。
2. 通过打卡助手智能机器人长连接 `sendMessage(chatid, markdown)` 发送群消息。
3. 未捕获群 `chatid` 时返回明确错误，提示先在目标群 @ 打卡助手。
4. 发送失败时返回 `WECOM_SEND_FAILED`，并记录失败原因。
5. 编写测试覆盖 mock 成功、未配置失败。

### Task 9: Worker 与队列

**Files:**
- Create: `apps/worker/package.json`
- Create: `apps/worker/src/main.ts`
- Create: `apps/worker/src/worker.module.ts`
- Create: `apps/worker/src/queues/queue-names.ts`
- Create: `apps/worker/src/wecom/wecom-message.processor.ts`
- Create: `apps/worker/src/dev/dev-jobs.controller.ts`

**Interfaces:**
- Produces: BullMQ queue `wecom-message`。
- Produces: 开发触发接口或脚本：发送测试小贴士、示例周榜。

**Steps:**

1. worker 连接 Redis。
2. 注册 `wecom-message` processor。
3. processor 调用共享的企业微信发送服务或等价发送适配器。
4. 失败时记录 attempt 和 last_error。
5. 提供开发脚本或 API 触发示例消息。
6. 验证：启动 Redis 后，可将一条测试消息入队并消费。

### Task 10: Web 工作台骨架

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/src/main.ts`
- Create: `apps/web/src/App.vue`
- Create: `apps/web/src/router/index.ts`
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/layouts/WorkbenchLayout.vue`
- Create: `apps/web/src/stores/session.ts`
- Create: `apps/web/src/styles/main.css`

**Interfaces:**
- Consumes: `GET /api/me`。
- Produces: 三类角色导航和基础布局。

**Steps:**

1. 创建 Vue 3 + Vite + TypeScript 应用。
2. 配置 API base URL。
3. 实现工作台布局：左侧导航、顶部角色切换、主内容区。
4. 路由按角色展示入口，但第一阶段允许 mock 切换。
5. 实现统一加载、错误和空态组件。
6. 验证：`pnpm --filter @openfit/web dev` 可打开首页。

### Task 11: Web 员工端体验

**Files:**
- Create: `apps/web/src/pages/employee/TodayCheckin.vue`
- Create: `apps/web/src/pages/employee/MyRecords.vue`
- Create: `apps/web/src/pages/employee/Leaderboard.vue`
- Create: `apps/web/src/pages/employee/AiCoach.vue`
- Create: `apps/web/src/api/checkins.ts`

**Interfaces:**
- Consumes: `POST /api/checkins/recognize`
- Consumes: `POST /api/checkins/:id/submit`
- Consumes: `GET /api/checkins/mine`

**Steps:**

1. 今日打卡页提供文本输入。
2. 点击识别后展示运动类型、时长、距离、强度、估算热量、置信提示。
3. 员工点击确认后调用 submit 并刷新今日状态。
4. 我的记录页展示状态标签。
5. 排行榜和 AI 教练页第一阶段使用真实布局 + 示例/占位数据，明确标注后续接入。

### Task 12: Web 管理端与企业微信配置

**Files:**
- Create: `apps/web/src/pages/admin/Dashboard.vue`
- Create: `apps/web/src/pages/admin/ReminderTasks.vue`
- Create: `apps/web/src/pages/admin/CheckinManagement.vue`
- Create: `apps/web/src/pages/org/WeComSettings.vue`
- Create: `apps/web/src/api/admin.ts`
- Create: `apps/web/src/api/wecom.ts`

**Interfaces:**
- Consumes: `GET /api/admin/dashboard/summary`
- Consumes: `GET /api/admin/reminders`
- Consumes: `POST /api/admin/wecom/test-message`

**Steps:**

1. 运营看板展示打卡率、未打卡人数、累计运动时长和待处理异常。
2. 提醒任务页展示 pending、sent、failed、manual 状态。
3. 企业微信配置页展示当前智能机器人长连接群推送说明和测试发送结果。
4. 测试发送按钮调用后端并展示成功、失败或未配置原因。
5. 打卡管理、活动配置、成员映射等页面先提供主体框架和空态。

### Task 13: Docker Compose 与启动体验

**Files:**
- Create: `infra/docker/docker-compose.yml`
- Create: `infra/docker/README.md`
- Modify: `package.json`

**Interfaces:**
- Produces: 本地启动路径。
- Consumes: `.env`。

**Steps:**

1. Compose 服务包含 PostgreSQL、Redis、API、worker、Web。
2. PostgreSQL 挂载本地 volume。
3. API、worker 挂载 `storage/uploads`。
4. Web 通过环境变量访问 API。
5. 文档说明：
   - 复制 `.env.example` 到 `.env`
   - 启动依赖
   - 执行本地开发数据库初始化 `pnpm dev:db:setup`
   - 启动 Web/API/worker
6. 验证：本地能访问 Web 首页和 API health。

### Task 14: 第一阶段验证与知识库回写

**Files:**
- Modify: `docs/知识库/基础架构.md`
- Modify: `docs/知识库/代码规范.md`
- Modify: `openspec/changes/prepare-open-fit-mvp/tasks.md`

**Interfaces:**
- Produces: 第一阶段验收证据。

**Steps:**

1. 运行 `pnpm lint`。
2. 运行 `pnpm typecheck`。
3. 运行 `pnpm test`。
4. 运行 `pnpm openspec:validate`。
5. 手工验证：
   - Web 可以打开。
   - 今日打卡可以从输入到确认提交。
   - 管理看板能看到 seed 数据。
   - 企业微信配置页 mock 测试发送成功。
   - 捕获目标群 `chatid` 后，群内能收到打卡助手长连接测试消息。
6. 更新 `tasks.md` 中已完成项。
7. 若目录结构、启动方式和技术栈已稳定，回写知识库。

## Phase 1 Acceptance Criteria

- 一条命令或清晰命令序列可以启动 PostgreSQL、Redis、API、worker 和 Web。
- Web 工作台可以用 mock 角色体验员工、活动管理员和企业管理员入口。
- 员工能完成一次文本打卡：输入、识别、确认、记录展示。
- 管理员能看到运营看板、提醒任务和企业微信测试发送入口。
- 后端模块边界已经形成，不把打卡、企业微信、AI、统计混在单文件中。
- worker 能消费企业微信消息 job；群主动推送由 API 进程内智能机器人长连接发送器承担。
- `.env.example` 完整，仓库不包含真实密钥。
- 本地上传目录存在但不被静态公开。
- lint、类型检查、测试和 OpenSpec 校验通过。

## Phase 2 Preview

第二阶段在第一阶段框架上补真实集成和业务闭环：

- 企业微信智能机器人 @ 入站回调、意图路由、群内打卡确认和 AI 教练安全回复。
- 企业微信 OAuth、userid 绑定、自建应用 access token 和应用消息。
- 真实提醒扫描、个人定向提醒、manual 任务处理。
- 排行榜计算、快照、周榜群推送和规则配置。
- 管理员打卡作废、审计日志、活动配置。

## Phase 2 Increment Progress

当前已完成一批不依赖外部企业微信权限的第二阶段业务闭环：

- 排行榜实时计算：按有效打卡天数优先、累计运动时长次之排序。
- 排行榜快照重建：提供 `POST /api/leaderboards/rebuild`，写入 `leaderboard_snapshots` 和 `leaderboard_entries`。
- 周榜群推送：`POST /api/admin/wecom/weekly-leaderboard` 使用真实排行榜结果组装群消息，不展示图片、健康咨询原文、敏感备注或未打卡名单。
- 提醒扫描：`POST /api/admin/reminders/scan` 为当天未提交有效打卡的成员生成 `web_manual` 任务。
- 提醒重试：`POST /api/admin/reminders/:id/retry` 将任务置为 `eligible` 并增加尝试次数。
- 管理员打卡作废：`GET /api/admin/checkins` 和 `POST /api/admin/checkins/:id/invalidate` 支持管理查看、作废和审计。
- 企业微信自建应用骨架：`GET /api/admin/wecom/app/status`、`GET /api/auth/wecom/login-url`、`POST /api/auth/wecom/callback`、`POST /api/admin/wecom/app-message` 已支持配置预检和 mock 联调。
- 成员映射：`GET /api/admin/members`、`POST /api/admin/members/:id/wecom-userid`、`POST /api/admin/members/sync/wecom` 已支持成员列表、userid 手动绑定和 mock 通讯录同步预检。

当前已经补齐的后续能力：

- 真实企业微信 API 代码路径：access_token、OAuth code 换 userid、message/send 和通讯录 simplelist 同步；未配置真实凭证时自动保持 mock/缺配置状态。
- 活动配置和排行榜规则配置：提供活动配置页面和 `PUT /api/activities/:id/config`。
- 个人定向提醒：提醒任务支持调用自建应用消息适配器，成功标记 `sent`，未绑定 userid 降级为 `manual`。
- AI 文本解析：文本打卡优先通过 AI adapter，未配置模型时降级本地解析。
- 健康咨询日志：保存 question hash、风险等级、摘要，不保存完整原文。
- 图片附件治理：支持 base64 图片上传到本地存储、附件元数据、鉴权元数据路由和删除标记。

仍需外部联调的能力：

- 真实企业微信群机器人 webhook 发送截图或日志证据。
- 真实企业微信 OAuth、message/send、通讯录同步需要替换 `.env` 后在企业微信环境中验证。

## WeCom Intelligent Bot Increment

本增量优先闭环企业微信智能机器人能力，作为 Phase 2 的第一条开发线。

### Task W1: 共享契约与状态

- 新增入站请求契约 `WeComBotEventRequest`，字段包含 `messageId`、`fromUserId`、`text`、`chatId`。
- 新增回复契约 `WeComBotEventResponse`，字段包含 `replyType`、`text`、`intent`、`checkinId?`。
- 新增意图枚举 `BotIntent`：`checkin_record`、`checkin_confirm`、`coach_advice`、`activity_query`、`leaderboard_query`、`unknown`。
- 新增配置服务：AI 预留 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL=gpt-5.5`；企业微信预留智能机器人 Bot ID、Secret、可选长连接地址和群机器人 webhook。

### Task W2: 意图路由与健康安全分类

- 创建 `BotIntentRouterService`，用规则优先识别确认、打卡、排行榜、活动规则和教练咨询。
- 创建 `CoachSafetyService`，对胸痛、晕厥、急性损伤、药物、孕产、术后、慢性病急性发作、极端减重等内容返回高风险拒答。

### Task W3: 智能机器人入站服务

- 创建 `WeComBotService`，负责成员映射、消息幂等、调用打卡服务或教练服务并生成回复。
- 第一阶段通过 `fromUserId` 映射 `members.wecomUserid`，如果找不到则回绑定提示。
- 第一阶段幂等可以通过内存或审计记录占位实现，后续落库为正式消息表。

### Task W4: API 回调入口

- 智能机器人入站只通过 SDK 长连接接收，不新增 URL 回调入口。
- 开发态通过服务测试、SDK 事件 fake client 或 mock 模式验证入站处理。
- 增加 API 测试覆盖打卡、确认、AI 安全拒答和未知用户。

### Task W5: 企业微信图片与图文混排打卡

- 扩展 `WeComBotEventRequest`，支持 `messageType=text|image|mixed` 与 `attachments[]`。
- 入站消息有文本和图片时，按文本生成待确认打卡，并将图片保存为受控附件元数据。
- 入站消息只有图片时，不创建匿名打卡；已绑定用户返回补充提示，要求补充运动类型、时长或距离。
- 真实企业微信联调时，适配层使用企业微信图片素材标识下载文件，本地保存后只把附件元数据传给打卡业务。
- 增加测试覆盖：图文混排生成待确认打卡、图片-only 返回补充提示、未知 userid 不创建匿名记录。

### Task W6: 意图路由增强

- 路由策略调整为显式关键词优先：`打卡`、`确认/提交`、`AI教练/教练`、`活动/规则`、`榜单/排名`。
- 无显式关键词时使用规则语义兜底；后续可替换为 OpenAI-compatible AI intent classifier。
- 低置信度或冲突意图必须回复追问，不直接创建打卡或调用 AI 教练。
- 增加测试覆盖关键词优先、语义兜底和低置信追问。

### Task W7: 双机器人与图片必填打卡

- 企业微信员工入口调整为两个智能机器人：`Open Fit 打卡助手` 和 `Open Fit AI 教练`。
- 入站契约增加 `botRole=checkin|coach` 和 `botId`；后端可通过 `WECOM_CHECKIN_BOT_ID`、`WECOM_COACH_BOT_ID` 推断职责。
- 打卡助手 text-only 不创建打卡，提示补发图片。
- 打卡助手 mixed 使用文字优先解析，保存图片附件，生成待确认打卡。
- 打卡助手 image-only 调用 AI 图片识别生成待确认打卡，保存图片附件。
- AI 教练不创建打卡，承载训练建议、活动规则、活动信息和排行榜查询。
- 确认提交前必须检查最近待确认打卡是否存在 active 图片附件；没有图片附件不得提交为有效打卡。

### Task W8: SDK 长连接接入

- 智能机器人生产接入方式调整为 SDK 长连接，不保留 URL 回调 fallback。
- 引入 `@wecom/aibot-node-sdk`，通过 `WECOM_CHECKIN_BOT_ID`、`WECOM_CHECKIN_BOT_SECRET`、`WECOM_COACH_BOT_ID`、`WECOM_COACH_BOT_SECRET` 建立两条长连接。
- 新增 `WeComStreamBotService`，监听 SDK `message.text`、`message.image`、`message.mixed` 事件。
- 长连接适配层把 SDK frame 转换为现有 `WeComBotEventRequest`，注入 `botRole=checkin|coach` 后复用 `WeComBotService.handleEvent()`。
- 业务回复通过 SDK `replyStream` 发回企业微信。
- `NODE_ENV=test` 时不得主动建立外部长连接；真实运行默认建立智能机器人长连接。

## Local Guardrail Increment

本增量补齐 AI 教练的本地轻量安全围栏，覆盖企业微信 AI 教练和 Web Coach API。

- 引入 `@andersmyrmel/vard` 作为本地 prompt injection 检测组件，不需要额外部署服务。
- 引入 `sensitive-word-tool` 作为本地 DFA 敏感词检测引擎，结合内置词表和 `LOCAL_GUARDRAIL_EXTRA_WORDS` 企业自定义词。
- 新增 `LocalGuardrailService`，统一处理中文提示词注入、敏感/违禁词、PII、secret 和健康高风险检测。
- `CoachSafetyService` 负责把本地 guardrail 结果转换为面向用户的安全提示，并提供模型输出侧校验。
- 企业微信 AI 教练先执行安全校验，再进行活动/榜单/教练意图路由；输入未通过时不得调用真实 AI Provider。
- Web Coach API 与企业微信 AI 教练复用同一套输入/输出双向安全校验。
- 验证重点：中文提示词注入不调用模型、违禁内容不调用模型、模型输出密钥泄漏被替换、低风险问题仍调用真实 AI Provider。

## Phase 3 Preview

第三阶段补 AI 与图片增强：

- 真实 AI 文本解析 adapter。
- 健康咨询 `normal`、`caution`、`escalate` 分类与拒答模板。
- 图片上传、附件治理、图片识别扩展、删除策略。

## Validation Commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm openspec:validate`
- `openspec validate prepare-open-fit-mvp`
- `openspec status --change prepare-open-fit-mvp`

## Knowledge Base Writeback

第一阶段结束前必须检查：

- 如果 monorepo 目录结构已落地，更新 `docs/知识库/代码规范.md`。
- 如果 Docker Compose 启动方式已落地，更新 `docs/知识库/基础架构.md`。
- 如果企业微信长连接入站或主动群推送边界变化，更新 `docs/知识库/业务规范.md` 或 `基础架构.md`。

## Completion Verification

- 所有第一阶段任务在 `tasks.md` 中勾选。
- OpenSpec 校验通过。
- 启动和体验路径有命令记录或截图证据。
- 没有把第二、第三阶段能力误标为已完成。

## Manual Adjustments

本计划根据用户新目标调整：第一阶段不追求完整 MVP，而是交付一个可简单体验、整体框架完善、可接入企业微信机器人或消息推送的运行框架。
