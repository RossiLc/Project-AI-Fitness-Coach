# Tasks

## 1. 第一阶段范围确认

- [x] 1.1 确认第一阶段目标为“可运行纵向框架”，不是完整业务 MVP。
- [x] 1.2 确认第一阶段技术栈：Vue 3、Vite、TypeScript、Node.js、NestJS、PostgreSQL、Redis/BullMQ、Prisma、本地磁盘存储、Docker Compose。
- [x] 1.3 确认第一阶段必须能接入企业微信群机器人 webhook；自建应用消息、OAuth 和成员同步可先做配置骨架与 mock 降级。
- [x] 1.4 确认第一阶段采用种子数据和 mock 登录体验员工、活动管理员、企业管理员三类角色。
- [x] 1.5 确认图片识别、完整 AI 问答、生产排行榜规则、真实个人提醒不作为第一阶段阻塞项。

## 2. 第一阶段工程骨架

- [x] 2.1 创建 monorepo 目录：`apps/web`、`apps/api`、`apps/worker`、`packages/shared`、`infra/docker`、`storage/uploads`。
- [x] 2.2 配置 pnpm workspace、根 `package.json`、TypeScript 基础配置、EditorConfig 和项目脚本。
- [x] 2.3 创建 Docker Compose，启动 PostgreSQL、Redis，并为 API、worker、Web 保留服务配置。
- [x] 2.4 创建 `.env.example`，覆盖数据库、Redis、企业微信 webhook、文件存储、mock 模式和端口。
- [x] 2.5 配置基础质量门禁：格式化、lint、类型检查、测试、OpenSpec 校验脚本。

## 3. 第一阶段后端主体框架

- [x] 3.1 搭建 NestJS API 应用，提供全局配置、日志、异常过滤、健康检查和版本信息接口。
- [x] 3.2 建立后端模块边界：auth、members、activities、checkins、leaderboards、reminders、wecom、ai、admin、audit、files。
- [x] 3.3 配置 Prisma schema 与首批核心表：organizations、members、activities、checkins、recognition_results、wecom_configs、reminder_tasks、audit_logs。
- [x] 3.4 提供 seed 数据，生成一个企业、三类角色成员、一个进行中活动、若干示例打卡与提醒任务。
- [x] 3.5 实现 mock auth：`GET /api/me`、角色切换、权限守卫占位，不接真实企业微信 OAuth。
- [x] 3.6 实现活动与仪表盘只读 API：当前活动、今日概览、示例排行榜、提醒任务列表。
- [x] 3.7 实现文本打卡体验 API：识别、确认提交、我的记录；识别先使用规则解析器，不强制接真实 AI。
- [x] 3.8 实现企业微信群机器人发送 API：配置读取、测试发送、失败记录、mock 发送模式。
- [x] 3.9 实现本地文件存储骨架：上传目录创建、鉴权下载路由占位、禁止静态暴露上传目录。

## 4. 第一阶段 worker 与企业微信触达

- [x] 4.1 搭建 NestJS worker 应用，复用配置、Prisma、Redis/BullMQ 和共享类型。
- [x] 4.2 定义 BullMQ 队列：`wecom-message`、`daily-tip`、`reminder-scan`、`leaderboard-snapshot`。
- [x] 4.3 实现企业微信消息发送 job：支持真实 webhook 与 mock 发送，记录 attempt、last_error 和状态。
- [x] 4.4 实现手动触发接口或脚本：发送测试小贴士、生成示例提醒任务、发送示例周榜。
- [x] 4.5 在企业微信权限不可用时，将个人提醒保留为 Web 看板 manual 任务。
- [x] 4.6 实现企业微信智能机器人入站接口：接收群内 @ 文本、映射成员、做消息幂等并返回机器人回复。
- [x] 4.7 实现智能机器人意图路由：区分今日打卡、确认提交、AI 健身教练、活动查询、排行榜查询和未知意图。
- [x] 4.8 实现群内今日打卡闭环：运动文本生成待确认结果，员工回复“确认/提交”后提交有效打卡。
- [x] 4.9 实现群内 AI 健身教练安全回复：低风险给建议，高风险使用拒答/谨慎模板，不输出医疗诊断。

## 5. 第一阶段 Web 工作台主体框架

- [x] 5.1 搭建 Vue 3 + Vite + TypeScript Web 应用，配置路由、API client、环境变量和基础布局。
- [x] 5.2 实现三类角色导航：员工区、活动管理员区、企业管理员区，并支持 mock 角色切换。
- [x] 5.3 实现员工端骨架：今日打卡、我的记录、排行榜、AI 教练占位。
- [x] 5.4 实现今日打卡可体验闭环：输入文本、调用识别 API、展示识别结果、确认提交、刷新状态。
- [x] 5.5 实现活动管理员端骨架：运营看板、打卡管理占位、提醒任务、排行榜管理占位、活动配置占位。
- [x] 5.6 实现企业管理员端骨架：企业微信配置、成员映射占位、角色权限占位、系统设置占位。
- [x] 5.7 实现企业微信配置体验：填写或读取 webhook 配置、测试发送、展示成功/失败/mock 状态。
- [x] 5.8 实现统一加载、空态、错误态、未授权态和后端不可用提示。

## 6. 第一阶段验证

- [x] 6.1 为 API 健康检查、mock auth、文本打卡状态流和企业微信发送服务补充自动测试。
- [x] 6.2 为 Web 今日打卡、角色切换、企业微信测试发送补充组件或端到端冒烟测试。
- [x] 6.3 验证 `docker compose up` 或等价命令能启动 PostgreSQL、Redis、API、worker、Web。
- [ ] 6.4 验证无真实 webhook 时 mock 模式可演示；配置真实 webhook 时能向企业微信群发送测试消息。
- [x] 6.5 验证 Web 页面不展示原始图片、健康咨询原文、敏感备注或群内未打卡名单。
- [x] 6.6 运行 lint、类型检查、测试和 OpenSpec 校验。

## 7. 后续阶段拆分

- [x] 7.1 第二阶段实现真实企业微信 OAuth、userid 绑定、自建应用消息和成员同步。
- [x] 7.2 第二阶段完善排行榜计算、快照、周榜群推送和排行榜规则配置。
- [x] 7.3 第二阶段完善提醒扫描、个人定向提醒、失败重试和人工处理闭环。
- [x] 7.4 第三阶段接入 AI 文本解析、健康咨询安全分类、拒答模板和免责声明。
- [x] 7.5 第三阶段实现图片上传、附件治理、图片识别扩展和删除策略。
- [x] 7.6 每个阶段结束前执行知识库回写检查，并按需更新 `docs/知识库/`。

## 8. 当前实现增量记录

- [x] 8.1 实现当前排行榜实时计算：按有效打卡天数优先、累计运动时长次之排序，只统计 `submitted` 和 `corrected`。
- [x] 8.2 实现排行榜快照重建接口，并为周榜群推送改用真实排行榜结果。
- [x] 8.3 实现提醒扫描接口：在自建应用消息未接入时，为未打卡成员生成 `web_manual` 任务。
- [x] 8.4 实现提醒重试接口：失败或人工处理任务可重新置为 `eligible` 并增加尝试次数。
- [x] 8.5 实现管理员打卡管理列表、作废接口和审计日志。
- [x] 8.6 Web 工作台接入真实排行榜、提醒扫描/重试和管理员打卡作废。
- [x] 8.7 实现企业微信自建应用配置状态、OAuth URL 生成、mock OAuth 回调和 mock 应用消息发送骨架。
- [x] 8.8 实现成员映射接口和 Web 页面：成员列表、企业微信 userid 手动绑定、mock 通讯录同步预检。
- [x] 8.9 实现企业微信自建应用真实 API 代码路径：access_token、OAuth code 换 userid、message/send 和通讯录 simplelist 同步。
- [x] 8.10 实现活动配置页面与排行榜规则配置接口。
- [x] 8.11 实现 AI 文本打卡解析 adapter、健康咨询日志 hash 化记录和高风险拒答模板。
- [x] 8.12 实现本地图片附件上传、附件表、鉴权元数据路由和删除标记策略。

## 10. 企业微信员工主入口与图文打卡增强

- [x] 10.1 明确普通员工主入口为企业微信群机器人，Web 员工区降级为调试/补充入口，并回写知识库。
- [x] 10.2 扩展企业微信智能机器人入站契约，支持文本、图片和图文混排消息。
- [x] 10.3 实现图文混排打卡：文本生成待确认打卡，图片保存为受控附件元数据。
- [x] 10.4 实现图片-only 提示补充信息，不创建匿名打卡。
- [x] 10.5 增强意图路由：显式关键词优先，规则语义兜底，低置信度追问确认。
- [x] 10.6 调整 Web 工作台导航与文案，突出管理员工作台，员工区标记为调试/补充入口。
- [x] 10.7 运行 lint、类型检查、测试、构建和 OpenSpec 校验。

## 11. 企业微信双机器人与图片必填打卡

- [x] 11.1 将员工侧企业微信入口调整为两个智能机器人：打卡助手和 AI 教练。
- [x] 11.2 扩展入站契约与环境变量，支持 `botRole=checkin|coach`、`botId`、`WECOM_CHECKIN_BOT_ID`、`WECOM_COACH_BOT_ID`。
- [x] 11.3 实现打卡助手 text-only 拒绝入库并提示补发图片。
- [x] 11.4 实现打卡助手 mixed 文字优先解析并关联图片附件。
- [x] 11.5 实现打卡助手 image-only 调用 AI 图片识别，生成待确认打卡并关联图片附件。
- [x] 11.6 实现 AI 教练不创建打卡，承载训练建议、活动规则和排行榜查询。
- [x] 11.7 实现确认提交前校验 active 图片附件，无图片不得提交有效打卡。
- [x] 11.8 运行 lint、类型检查、测试、构建和 OpenSpec 校验。

## 12. 企业微信智能机器人 SDK 长连接接入

- [x] 12.1 将企业微信智能机器人接入方式调整为 SDK 长连接，不保留 URL 回调 fallback。
- [x] 12.2 引入官方 Node SDK `@wecom/aibot-node-sdk`，通过 `Bot ID + Secret` 建立 WebSocket 长连接。
- [x] 12.3 新增长连接适配服务，将 SDK `message.text`、`message.image`、`message.mixed` 事件转换为现有 `WeComBotEventRequest`。
- [x] 12.4 长连接适配层按机器人配置注入 `botRole=checkin|coach`，继续复用 `WeComBotService.handleEvent()`。
- [x] 12.5 通过 SDK `replyStream` 将业务回复发回企业微信。
- [x] 12.6 在 `test` 或 mock 模式下不主动建立外部长连接。
- [x] 12.7 运行 lint、类型检查、测试、构建和 OpenSpec 校验。

## 13. AI 教练本地轻量安全围栏

- [x] 13.1 引入 `@andersmyrmel/vard` 和 `sensitive-word-tool`，作为 API 进程内本地安全围栏依赖。
- [x] 13.2 实现 `LocalGuardrailService`，覆盖通用 prompt injection、中文提示词注入、敏感词/违禁词、PII、secret 和健康高风险检测。
- [x] 13.3 将 `CoachSafetyService` 改造为复用本地安全围栏，并提供模型输出侧安全校验。
- [x] 13.4 将企业微信 AI 教练入口调整为安全校验优先于意图路由，输入未通过时不得调用真实 AI Provider。
- [x] 13.5 将 Web Coach API 与企业微信 AI 教练统一接入输入/输出双向安全校验。
- [x] 13.6 更新 `.env.example`、README、知识库和 OpenSpec 产物，记录本地轻量安全围栏方案。

## 9. 外部联调阻塞项

- [ ] 9.1 配置真实 `WECOM_BOT_WEBHOOK_URL` 并关闭 `WECOM_MOCK_MODE` 后，向企业微信群发送测试消息并保留截图或日志证据。
## 14. 方案 B：单管理员 Web 工作台收敛

- [x] 14.1 明确普通员工不使用 Web 平台，员工端仅通过企业微信打卡助手和 AI 教练完成核心流程。
- [x] 14.2 将 Web 工作台收敛为单管理员视角，只保留运营看板、成员管理、活动配置、排行榜管理四个模块。
- [x] 14.3 后端补充成员今日未打卡筛选、成员打卡明细、打卡恢复、群提醒未打卡和今日看板统计接口。
- [x] 14.4 Web 成员管理支持今日未打卡筛选、成员明细穿透、提醒未打卡、打卡作废和恢复。
- [x] 14.5 Web 排行榜管理支持参与天数排行榜展示和手动重建。
- [x] 14.6 更新 OpenSpec 和知识库，记录方案 B 的产品边界、隐私规则和后台模块。
- [x] 14.7 运行 API/Web 类型检查、测试、构建和 OpenSpec 校验。
