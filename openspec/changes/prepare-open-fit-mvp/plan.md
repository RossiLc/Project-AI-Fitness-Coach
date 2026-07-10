# Prepare Open Fit MVP Solution Architecture Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `writing-plans` before code implementation, `test-driven-development` for business logic, and `verification-before-completion` before claiming completion.

**Goal:** 将 Open Fit MVP 从需求分析升级为可落地的方案级工程蓝图。

**Architecture:** 推荐采用 Vue 3 Web 工作台、Node.js + NestJS 模块化单体、PostgreSQL、Redis/BullMQ、Prisma、本地文件存储、企业微信接入模块和 AI 适配层。MVP 先交付文本打卡、确认、排行榜、提醒、小贴士、健康安全回复和管理员工作台，图片识别作为增强扩展。

**Tech Stack:** Vue 3、TypeScript、Vite、Node.js、NestJS、PostgreSQL、Redis、BullMQ、Prisma、本地磁盘存储、Docker Compose、OpenAI-compatible AI Adapter。

## Global Constraints

- 所有项目自写文档、OpenSpec 产物和新增说明使用中文。
- 企业微信 webhook key、secret、access token 和 AI API key 不得提交到仓库。
- AI 识别结果必须由员工确认或修正后才能计入排行榜。
- 群机器人不得公开点名未打卡成员。
- 健康咨询不得提供诊断、治疗、处方、药物调整或疾病管理结论。
- 图片能力启用前必须确认保存、删除、访问和脱敏策略。
- 方案级变更必须覆盖技术选型、前端、后端、企业微信、AI、数据模型、流程、部署、安全和验证矩阵。

---

## Scope

本计划覆盖 `prepare-open-fit-mvp` 的方案级设计、后续实现拆分和验证门禁。当前阶段不编写业务代码，但必须产出足够后续实现直接执行的前后端、数据、集成和运维方案。

## Covers

- 1.1 至 7.7
- VF-方案覆盖
- VF-前端工作台
- VF-后端 API
- VF-数据模型
- VF-企业微信
- VF-AI 安全
- VF-运维部署
- VF-知识库回写

## Plan Type

full

## Execution Strategy

tdd-preferred

实现阶段对状态流、排行榜、提醒任务和 AI 安全分类使用 TDD；企业微信联调用模拟测试加人工验证证据。

## Ordered Steps

1. 方案级输入确认
   - 读取 `AGENTS.md`、`docs/知识库/索引.md`、项目背景、基础架构、业务规范、AI 协作规范。
   - 读取 `analyze-open-fit-requirements` 产物和本变更全部产物。
   - 确认本变更是 `solution-architecture`，不能降级为普通 MVP 清单。

2. 技术栈确认
   - 默认采用 Vue 3、Vite、Node.js、NestJS、PostgreSQL、Redis/BullMQ、Prisma、本地磁盘存储、Docker Compose。
   - 如用户后续选择 Fastify、Express、MySQL 或对象存储，必须同步更新 `design.md`、`tasks.md` 和知识库。

3. 前端工作台执行单元
   - 设计员工端：今日打卡、我的记录、排行榜、AI 教练。
   - 设计活动管理员端：运营看板、打卡管理、排行榜管理、提醒任务、活动配置。
   - 设计企业管理员端：企业微信配置、成员映射、角色权限、系统设置。
   - 输出页面级状态：加载、空态、错误、未授权、待确认、成功。

4. 后端服务执行单元
   - 拆分 Node.js/NestJS 模块：auth、members、activities、checkins、leaderboards、reminders、wecom、ai、admin、audit。
   - 定义 API 分组、错误码、幂等策略、任务重试和审计。
   - 定义 worker 任务：每日小贴士、未打卡提醒、周榜快照、企业微信消息发送。

5. 数据模型执行单元
   - 建模 organizations、members、activities。
   - 建模 checkins、recognition_results、attachments。
   - 建模 leaderboard_snapshots、leaderboard_entries。
   - 建模 reminder_tasks、coach_advice_logs、wecom_configs、audit_logs。
   - 定义状态枚举、索引、唯一约束和数据保留策略。

6. 企业微信执行单元
   - 设计群机器人 webhook 配置和测试发送。
   - 设计自建应用 access token、OAuth、成员同步、应用消息。
   - 设计权限不可用时的降级路径：Web 看板 manual 任务。

7. AI 与安全执行单元
   - 设计文本打卡解析结构、默认参数和置信提示。
   - 设计健康咨询 `normal`、`caution`、`escalate`。
   - 设计拒答模板、免责声明和风险标签。
   - 设计图片识别扩展入口但不把图片识别列为 MVP 阻塞项。

8. 部署运维执行单元
   - 设计 Docker Compose 开发/测试环境。
   - 定义环境变量、密钥管理、日志字段、监控指标、备份和回滚策略。
   - 定义任务幂等和失败重试。

9. 验证矩阵与知识库回写
   - 将 `design.md` 的验证矩阵映射到后续测试、日志、截图和人工验证证据。
   - 更新 `docs/知识库/AI协作规范.md`、`基础架构.md` 或 `决策记录.md` 中长期有效的方案级门禁和技术决策。
   - 运行 OpenSpec 校验。

## Validation Per Step

1. 方案级输入确认
   - 命令：`openspec list --json`
   - 预期：能看到 `prepare-open-fit-mvp`，且本计划覆盖方案级设计。

2. 技术栈确认
   - 证据：`design.md` Technical Options 表和本计划 Tech Stack 一致。
   - 预期：没有互相矛盾的技术栈。

3. 前端工作台验证
   - 证据：`design.md` Frontend Workbench 表覆盖三类角色。
   - 预期：员工、活动管理员、企业管理员均有页面和关键状态。

4. 后端服务验证
   - 证据：`design.md` Backend Services 覆盖模块、API、worker、错误码。
   - 预期：每个核心流程都能映射到服务模块和 API。

5. 数据模型验证
   - 证据：`design.md` Data Model 覆盖核心表、枚举和索引。
   - 预期：打卡、排行榜、提醒、企业微信、AI 日志和审计均有数据承载。

6. 企业微信验证
   - 证据：`design.md` Enterprise WeCom Integration 覆盖群机器人、自建应用、OAuth、成员同步和降级。
   - 预期：权限不可用时仍有可执行降级路径。

7. AI 与安全验证
   - 证据：`design.md` AI Service Design 和 Security / Privacy / Compliance。
   - 预期：高风险咨询拒答、非医疗边界、图片隐私策略均明确。

8. 部署运维验证
   - 证据：`design.md` Operations。
   - 预期：开发测试环境、任务调度、日志、监控、备份、回滚均有说明。

9. 收尾验证
   - 命令：`openspec validate prepare-open-fit-mvp`
   - 命令：`openspec schema validate spec-driven-superpowers`
   - 命令：`openspec status --change prepare-open-fit-mvp`
   - 预期：校验通过，状态显示所有实现前产物完成。

## Files / Owners

- `openspec/schemas/spec-driven-superpowers/schema.yaml`：方案级 schema 指令。
- `openspec/schemas/spec-driven-superpowers/templates/*.md`：方案级模板。
- `openspec/schemas/spec-driven-superpowers/README.md`：schema 使用说明。
- `openspec/changes/prepare-open-fit-mvp/proposal.md`：方案级提案。
- `openspec/changes/prepare-open-fit-mvp/specs/**/*.md`：能力级需求规格。
- `openspec/changes/prepare-open-fit-mvp/design.md`：方案级设计。
- `openspec/changes/prepare-open-fit-mvp/review.md`：方案覆盖门禁。
- `openspec/changes/prepare-open-fit-mvp/tasks.md`：粗粒度任务清单。
- `openspec/changes/prepare-open-fit-mvp/plan.md`：执行计划。
- `docs/知识库/AI协作规范.md`：方案级 OpenSpec 规则回写。
- `docs/知识库/决策记录.md`：技术栈和 schema 强化决策回写。

## Completion Checkpoint

- schema/template 已强制方案级变更覆盖关键方案组件。
- `prepare-open-fit-mvp` 的 proposal 标记为 `solution-architecture`。
- `design.md` 覆盖技术选型、系统架构、前端、后端、企业微信、AI、数据模型、流程、安全、运维和验证矩阵。
- `review.md` 包含 Solution Coverage Gate。
- `tasks.md` 和 `plan.md` 按前端、后端、数据、企业微信、AI、运维和验证拆分。
- OpenSpec 校验通过。
- 长期流程规则已写回知识库。

## Knowledge Base Writeback

本次需要回写知识库：

- `docs/知识库/AI协作规范.md`：新增“方案级变更”规则，要求复杂平台方案覆盖技术选型、前后端、集成、数据、流程、部署、安全和验证矩阵。
- `docs/知识库/决策记录.md`：记录 `spec-driven-superpowers` schema 从通用模板强化为方案级门禁，以及 Open Fit MVP 推荐技术栈。
- 后续技术栈一旦被产品/技术最终确认，应同步更新 `docs/知识库/基础架构.md`。

## Completion Verification

- `openspec validate prepare-open-fit-mvp`
- `openspec schema validate spec-driven-superpowers`
- `openspec status --change prepare-open-fit-mvp`
- 扫描占位符和模板残留，确认变更产物中没有未替换内容。
- 检查 `tasks.md` 未把业务实现项误标为完成。

## Debugging Trail

触发信号：用户指出原方案缺少技术选项、前后端内容、企业微信接入、Web 工作台界面、数据表、后台服务和流程架构。

根因判断：

- 原 schema/template 对复杂方案没有强制覆盖项。
- 原 `design.md` 模板过于泛化。
- 原执行把方案级变更降级成 MVP 准备清单。

修复策略：

- 强化 schema/template。
- 重写 `prepare-open-fit-mvp` 为方案级产物。
- 用 Solution Coverage Gate 和验证矩阵防止再次退化。

## Review Follow-Up

已接受用户反馈，并将其转化为 schema 门禁、方案级设计章节、规格补充和任务拆分。

## Delegation Units

- 前端工作台单元：员工端、管理员端、企业配置端。
- 后端服务单元：Node.js/NestJS 模块、API、worker、错误码。
- 数据模型单元：Prisma schema、索引、状态、保留策略。
- 企业微信单元：群机器人、自建应用、OAuth、消息发送、降级。
- AI 安全单元：文本解析、健康咨询、安全分类、图片扩展。
- 运维验证单元：Docker Compose、环境变量、日志、监控、验证矩阵。

## Parallel Units

前端页面设计、数据模型、企业微信权限验证、AI 安全样例和运维方案可并行。后端代码实现需等待数据模型和认证方式确认。

## Isolation Boundaries

当前阶段只更新文档和 schema。后续实现阶段应按 `apps/web`、`apps/api`、`packages/shared`、`infra` 或等价目录边界隔离。

## Execution Notes

本计划替代上一版过浅的 MVP 准备计划，明确把 Open Fit 作为方案级平台设计处理。

## Manual Adjustments

无。
