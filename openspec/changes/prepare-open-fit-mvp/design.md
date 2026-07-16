# Design

## Current Decision: 方案 B 单管理员工作台

当前实现阶段采用方案 B：员工端不提供 Web 使用入口，普通员工只通过企业微信两个智能机器人完成核心流程；Web 收敛为单管理员运营后台。此前设计中的员工 Web 区、企业微信配置页、角色权限页和系统设置页不再作为当前 Web 产品面向用户的页面。

单管理员 Web 后台以企业微信群作为工作空间边界，标准工作路径是：群管理 -> 选择当前群 -> 运营看板 / 成员管理 / 活动配置 / 排行榜管理。没有当前群时，后续模块不可用并展示空态。

单管理员 Web 后台保留五个模块：
- 群管理：创建待绑定群、展示绑定口令、保存企业微信智能机器人入站 `chatid`、选择当前群、通过 Excel userid 名册导入群成员。
- 运营看板：今日打卡人数、未打卡人数、总人数、打卡率。
- 成员管理：成员列表、今日未打卡筛选、成员打卡明细、打卡作废/恢复、提醒未打卡。
- 活动配置：当前活动规则配置，并作为 AI 教练活动知识来源。
- 排行榜管理：参与天数排行榜，支持后续扩展其他排行榜。

提醒未打卡必须基于当前群成员计算，并通过当前群绑定的打卡助手长连接发送到该群；当前实现会在群消息中 @ 未打卡成员的企业微信 userid。

## Context

Open Fit 面向企业内部员工，产品形态包括企业微信 AI 健身教练和 Web 运动打卡平台。MVP 需要同时解决“员工愿意打卡”“管理员能运营活动”“企业微信能触达成员”“AI 输出安全可控”“排行榜可信可解释”五类问题。

本设计采用方案级粒度，目标是让后续实现者能直接据此拆分前端、后端、数据、企业微信接入、AI 服务和验证任务。

## Goals

- 第一版交付文本打卡、AI/规则解析、用户确认、排行榜、每日小贴士、每周榜单、健康咨询安全回复和基础管理员工作台。
- 企业微信以群机器人承担公开群通知，以自建应用承担个人提醒和 OAuth 身份能力。
- Web 工作台覆盖员工、活动管理员和企业管理员三类角色。
- 后端采用模块化单体，先保证边界清晰，后续可按模块拆服务。
- 数据模型支持活动周期、补卡、撤回、管理员修正、排行榜快照、提醒任务和审计。

## Non-Goals

- 不在 MVP 中做微服务拆分、Kubernetes 高可用、复杂多租户商业化。
- 不在 MVP 中强制上线图片识别；只保留数据与接口扩展点。
- 不做医疗诊断、疾病管理、药物建议或专业康复计划。
- 不做积分商城、奖励兑换、跨企业赛事和可穿戴设备同步。

## Proposed Design

Open Fit MVP 使用“企业微信群机器人员工入口 + Web 管理工作台 + 模块化后端 + PostgreSQL + Redis 队列 + 企业微信接入 + AI 适配层”的架构。

### 产品一句话

Open Fit 是企业健身活动的“企业微信群参与入口 + 记录系统 + 运营后台 + 企业微信触达层”。它不是单纯的聊天机器人，也不是单纯的打卡表单，而是把员工每天的运动行为、AI 辅助识别、活动统计、排行榜和提醒连接成一个闭环。

### 对初学者的产品解释

可以把 Open Fit 理解成三件工具合在一起：

1. **员工的运动日记**：员工每天用一句话记录运动，系统帮忙整理成结构化打卡。
2. **管理员的活动台账**：管理员不再靠翻群消息统计，而是在后台看到参与率、排行榜、异常记录和提醒任务。
3. **企业微信的触达助手**：智能机器人负责员工群内打卡、咨询和查询，群机器人 webhook 负责公开推送，自建应用负责更强身份能力和个人消息。

因此，Open Fit 的核心价值不是“AI 替人运动”或“聊天机器人更聪明”，而是让企业健身活动有清晰的数据闭环：谁参加、是否打卡、打卡是否有效、榜单如何计算、谁需要提醒、哪些内容不能公开。

### MVP 产品边界的讲解口径

| 问题 | 对外讲法 | 设计含义 |
| --- | --- | --- |
| 它是什么？ | 企业内部健身活动的打卡、统计、提醒和 AI 辅助平台。 | 企业微信群机器人是员工入口，Web 工作台是管理员主系统。 |
| 它不是什么？ | 不是医疗诊断工具，不是单纯群机器人，不是完整运动 App。 | AI 必须有安全边界，MVP 不做可穿戴设备和复杂训练计划。 |
| MVP 先做什么？ | 先让文本打卡闭环稳定可用。 | 识别、确认、统计、提醒、榜单优先于图片识别和积分商城。 |
| 为什么要 Web？ | 群消息适合员工参与，不适合管理员做可追踪的数据管理。 | 管理、审计、配置、纠错都必须在 Web 工作台完成；员工 Web 入口只做补充和调试。 |
| 为什么要企业微信？ | 员工在企业微信里被触达最自然。 | 群机器人与自建应用承担不同权限和隐私职责。 |

### 一个工作日里会发生什么

| 时间/动作 | 发生的事 | 系统支撑 |
| --- | --- | --- |
| 上午 9 点 | 企业微信群收到一条低风险运动小贴士 | worker 触发小贴士任务，群机器人发送 |
| 白天任意时间 | 员工在企业微信群 @ 机器人提交文本或图片打卡 | 智能机器人回调调用打卡识别 API，Web 员工页仅作补充入口 |
| 提交后 | AI/规则解析出运动类型、时长、距离和估算热量 | Node.js 后端保存识别结果 |
| 确认时 | 员工修正或确认识别结果 | 打卡记录从 `recognized` 变为 `submitted` |
| 晚上 20 点 | 系统识别未打卡成员并生成提醒任务 | BullMQ worker 扫描活动与打卡记录 |
| 每周固定时间 | 群内推送排行榜卡片 | 排行榜快照生成后由群机器人推送 |
| 运营过程中 | 管理员查看完成率、作废异常记录、重试提醒 | 管理端页面 + 审计日志 |

核心链路：

1. 员工通过企业微信 OAuth 或企业内账号登录 Web。
2. 员工在 Web 提交文本运动内容。
3. 后端调用 AI 解析器或规则解析器生成结构化识别结果。
4. 员工确认或修正后生成有效打卡记录。
5. 统计模块按活动规则生成排行榜快照。
6. 调度任务每天推送小贴士、生成未打卡提醒任务、每周推送榜单。
7. 企业微信群机器人处理群内 @ 咨询，AI 安全层判断是否普通回答、谨慎回答或风险升级。

### MVP 和后续增强边界

| 类型 | MVP 必做 | 后续增强 |
| --- | --- | --- |
| 打卡 | 文本打卡、AI/规则解析、用户确认、修正、撤回、管理员作废 | 图片识别、运动截图 OCR、批量导入 |
| 企业微信 | 群机器人小贴士/周榜、自建应用个人提醒方案、OAuth 设计 | 多群绑定、复杂消息卡片、更多企业微信事件回调 |
| 统计 | 有效打卡天数、累计时长、排行榜快照 | 积分模型、团队赛、奖励兑换 |
| AI | 文本解析、健康咨询安全分类、拒答模板 | 多模态识别、个性化训练建议、内容运营后台 |
| 管理 | 活动配置、打卡管理、提醒任务、企业微信配置 | 多活动模板、审批流、运营报表导出 |

### 第一阶段可运行框架边界

第一阶段目标不是交付完整业务 MVP，而是交付一个“能跑、能点、能接、能扩”的纵向骨架。它需要让团队和业务同事看到整体框架已经成立：Web 工作台能打开，后端模块边界存在，数据库和队列能启动，文本打卡能简单体验，企业微信机器人能 mock 或真实发送测试消息。

第一阶段验收口径：

| 能力 | 第一阶段必须交付 | 第一阶段暂不阻塞 |
| --- | --- | --- |
| 工程结构 | `apps/web`、`apps/api`、`apps/worker`、`packages/shared`、`infra/docker`、`storage/uploads` | 生产级 CI/CD、Kubernetes、多环境发布体系 |
| Web 工作台 | 三类角色导航、今日打卡闭环、运营看板、提醒任务、企业微信配置页骨架 | 完整高保真 UI、全部后台 CRUD、复杂权限后台 |
| 后端 API | 健康检查、mock auth、当前活动、文本打卡、我的记录、dashboard、提醒任务、企业微信测试发送 | 真实企业微信 OAuth、通讯录同步、完整活动配置 |
| 数据模型 | Prisma 首批核心表、seed 数据、状态枚举、配置表和审计表骨架 | 全部索引优化、复杂保留策略、图片治理完整实现 |
| 企业微信 | 智能机器人长连接入站、打卡助手长连接主动群推送、群 `chatid` 捕获 | 自建应用个人消息、生产 OAuth、成员 userid 自动同步 |
| Worker | BullMQ 队列、企业微信消息 job、测试小贴士/示例周榜触发 | 完整未打卡扫描、周榜正式调度、复杂重试运营 |
| AI | 规则解析器模拟文本识别，保留 AI adapter 边界 | 真实模型调用、健康咨询完整分类、图片识别 |
| 文件 | 本地上传目录和鉴权访问路由占位，禁止静态公开 | 真实图片上传、缩略图、删除清理任务 |

第一阶段建议采用 mock 登录和 seed 数据。mock 不是临时乱写，而是明确为后续企业微信 OAuth 替换预留边界：前端只依赖 `GET /api/me`，后端通过 `CurrentUser` 和角色守卫传递身份，后续替换认证来源时不改业务页面。

第一阶段完成后，后续阶段可以沿三条线并行推进：

1. 企业微信真实集成：OAuth、userid、自建应用消息、成员同步。
2. 业务闭环深化：排行榜快照、未打卡扫描、管理员作废、活动配置。
3. AI 与图片增强：真实 AI 解析、健康安全分类、图片上传识别和删除策略。

## Technical Options

| 领域 | 推荐方案 | 备选方案 | 取舍 |
| --- | --- | --- | --- |
| 前端 | Vue 3 + TypeScript + Vite | Nuxt | Vue 适合快速构建企业内部工作台；MVP 不依赖 SSR，Vite 开发体验轻量。若后续需要服务端渲染或更复杂路由能力，可评估 Nuxt。 |
| UI | Tailwind CSS + shadcn/ui 风格组件 | Ant Design | Tailwind 更利于定制轻量工作台；Ant Design 更快但风格厚重。MVP 可采用 Ant Design 加速后台表格。 |
| 后端 | Node.js + TypeScript + NestJS | Express/Koa、Fastify | Node.js 满足技术方向；NestJS 作为 Node.js 框架提供模块化、守卫、依赖注入和任务队列集成。若团队偏轻量，可替换为 Fastify。 |
| 数据库 | PostgreSQL | MySQL | PostgreSQL JSONB、枚举、索引和复杂查询适合排行榜快照、AI 结果和审计字段。 |
| 缓存/队列 | Redis + BullMQ | RabbitMQ、数据库轮询 | BullMQ 与 Node.js/NestJS 集成简单，适合提醒、排行榜、小贴士等异步任务。 |
| ORM | Prisma | TypeORM、Drizzle | Prisma schema 清晰，迁移和类型生成快；复杂 SQL 可用 raw query 补充。 |
| AI 服务 | OpenAI-compatible Adapter | 直接绑定单一模型 SDK | 使用适配层隔离模型供应商，文本解析和健康咨询可分策略配置。 |
| 文件存储 | 本地磁盘存储 | S3 兼容对象存储 | MVP 采用本地存储，配置独立上传目录和访问控制；后续容量、多实例或跨机部署需要时再迁移到对象存储。 |
| 部署 | Docker Compose 单机/内网 VM | Kubernetes | MVP 优先降低运维复杂度；后续再拆分扩容。 |

推荐技术栈：Vue 3、TypeScript、Vite、Node.js、NestJS、PostgreSQL、Redis/BullMQ、Prisma、本地磁盘存储、Docker Compose。

AI 联调约定：第一阶段保留 OpenAI-compatible 配置入口。AI 教练咨询、企业微信图片打卡和图文打卡识别都不使用模拟 AI 结果：高风险问题由安全围栏直接拒答，低风险咨询必须调用真实模型；图片/图文打卡必须调用真实多模态模型识别运动类型、运动时长和消耗能量。未配置 `AI_BASE_URL` 或 `AI_API_KEY` 时返回明确的未配置或识别失败提示，不创建伪造打卡记录。用户已确认后续使用 GPT-5.5，代码和环境变量预留 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL=gpt-5.5`，联调时由用户直接替换 `.env` 中的 URL 和 key。

AI 教练本地安全围栏选型：第一阶段不额外部署独立 guardrail 服务，采用 API 进程内轻量组件。`LocalGuardrailService` 组合 `@andersmyrmel/vard`、`sensitive-word-tool`、Open Fit 中文提示词注入规则、PII/secret 正则和健康高风险规则；`CoachSafetyService` 在企业微信 AI 教练和 Web Coach API 中统一复用。安全围栏执行输入和输出双向校验：输入未通过时不调用真实 AI Provider；模型输出命中密钥泄漏、系统提示词泄漏、敏感词、PII 或健康高风险时替换为安全提示。

## System Architecture

### 运行时组件

- `web-workbench`：Vue 3 + Vite Web 工作台，主要服务活动管理员端和企业配置端，员工端保留为开发调试和补充录入入口。
- `api-server`：Node.js + NestJS 模块化后端，提供 REST API、认证、业务服务和企业微信回调。
- `worker`：Node.js + NestJS worker 进程，消费 BullMQ 队列，执行提醒、排行榜、小贴士和消息发送。
- `postgres`：主业务数据库。
- `redis`：缓存、队列和任务去重。
- `local-file-storage`：MVP 本地文件存储目录，保存后续图片原图、缩略图或导入文件。
- `wecom`：企业微信智能机器人 SDK 长连接、群机器人 webhook、自建应用 API、OAuth。
- `ai-provider`：文本解析、健康咨询和后续图片识别模型。

### 模块边界

- `auth`：登录态、企业微信 OAuth、角色权限。
- `members`：成员、部门、企业微信 userid 映射。
- `activities`：活动周期、规则、补卡窗口、提醒配置。
- `checkins`：打卡记录、识别结果、确认修正、撤回作废。
- `leaderboards`：排行榜计算、快照、群卡片数据。
- `reminders`：未打卡名单、提醒任务、发送状态。
- `wecom`：智能机器人长连接、群机器人、自建应用 token、消息发送。
- `ai`：文本解析、健康咨询、安全分类、模型适配。
- `admin`：审核、配置、仪表盘。
- `audit`：关键操作审计。

## Frontend Workbench

### 角色与导航

- 员工：今日打卡、我的记录、排行榜、AI 教练。
- 活动管理员：运营看板、打卡管理、排行榜管理、提醒任务、活动配置。
- 企业管理员：企业微信配置、成员映射、权限角色、系统设置。

### 角色权限矩阵

| 能力 | 员工 | 活动管理员 | 企业管理员 |
| --- | --- | --- | --- |
| 提交/确认本人打卡 | 可用 | 可用 | 可用 |
| 查看本人记录 | 可用 | 可用 | 可用 |
| 查看团队排行榜 | 可用 | 可用 | 可用 |
| 作废他人打卡 | 不可用 | 可用 | 可用 |
| 配置活动规则 | 不可用 | 可用 | 可用 |
| 查看提醒任务 | 不可用 | 可用 | 可用 |
| 配置企业微信 | 不可用 | 不可用 | 可用 |
| 成员同步与角色分配 | 不可用 | 不可用 | 可用 |

### 页面级功能细化

#### 今日打卡

- 顶部显示今日活动状态：未打卡、待确认、已提交、已撤回。
- 文本输入框支持自然语言，例如“晚上慢跑 30 分钟，大概 5 公里”。
- 提交后展示识别结果卡片：运动类型、时长、距离、强度、估算热量、置信提示。
- 员工必须点击“确认提交”才生成有效记录。
- AI 解析失败时进入手工填写模式，不阻断打卡。
- 页面必须把“AI 识别结果”和“最终提交结果”分成两个视觉区域，避免员工误以为 AI 自动替他提交。
- 识别结果卡片需要有置信提示和估算说明，例如“热量仅用于活动统计，不是医学指标”。

#### 我的记录

- 支持按日历或列表查看历史打卡。
- 标记补卡、已修正、已撤回、管理员作废状态。
- 允许在活动规则允许范围内撤回或修正。
- 展示“识别结果”和“最终提交结果”的差异，帮助解释 AI 修正痕迹。

#### 运营看板

- 显示今日打卡人数、打卡率、未打卡人数、累计运动时长。
- 展示趋势图：按日统计有效打卡数和运动时长。
- 显示异常队列：待确认过久、发送失败、被作废记录。
- 提供进入打卡管理和提醒任务的快捷入口。
- 看板第一屏只放运营决策所需指标，不展示员工健康咨询原文和私密图片。

#### 打卡管理

- 支持按成员、部门、状态、日期、活动筛选。
- 管理员可查看详情、作废记录、填写作废原因。
- 所有管理员操作必须写入审计日志。

#### 企业微信配置

- 群机器人配置：名称、webhook 密钥引用、绑定活动、测试发送。
- 自建应用配置：corp id、agent id、secret 引用、可信域名、token 状态。
- 成员同步：优先通过 Excel userid 名册导入；具备通讯录权限时可扩展企业微信通讯录同步。
- 权限检查：展示 OAuth、userid、应用消息是否可用。

### Web 工作台信息架构草图

```text
Open Fit Web 工作台
├─ 员工区
│  ├─ 今日打卡：输入文本、查看识别结果、确认提交
│  ├─ 我的记录：历史、补卡、修正、撤回、作废状态
│  ├─ 排行榜：个人排名、团队榜、规则说明
│  └─ AI 教练：低风险咨询、免责声明、高风险拒答
├─ 活动管理员区
│  ├─ 运营看板：打卡率、未打卡、趋势、异常
│  ├─ 打卡管理：筛选、详情、作废、审计
│  ├─ 排行榜管理：快照、重算、推送状态
│  ├─ 提醒任务：待发送、失败、manual、重试
│  └─ 活动配置：周期、规则、补卡、提醒时间
└─ 企业管理员区
   ├─ 企业微信配置：群机器人、自建应用、测试发送
   ├─ 成员映射：wecom_userid、部门、角色
   ├─ 权限角色：员工、活动管理员、企业管理员
   └─ 系统设置：密钥引用、文件策略、审计策略
```

### 关键页面验收口径

| 页面 | 初学者可观察的验收点 | 不合格信号 |
| --- | --- | --- |
| 今日打卡 | 输入一句自然语言后，先看到识别结果，再确认提交。 | AI 识别后直接进入榜单，没有确认步骤。 |
| 我的记录 | 能看出每条记录是正常、补卡、已修正、已撤回还是被作废。 | 只有列表，没有状态和修正痕迹。 |
| 排行榜 | 能看到排名依据和更新时间。 | 只显示名次，不解释规则。 |
| 运营看板 | 管理员能一眼看到今日打卡率、未打卡人数和异常任务。 | 指标很多但无法指导下一步操作。 |
| 提醒任务 | 能区分已发送、失败、manual 和可重试任务。 | 发送失败只在日志里，不在页面可处理。 |
| 企业微信配置 | 能测试群机器人和自建应用权限。 | 填完配置后不知道是否可用。 |

### 页面设计

| 页面 | 角色 | 核心内容 | 关键状态 |
| --- | --- | --- | --- |
| 今日打卡 | 员工 | 文本输入、图片入口占位、AI 识别结果、确认提交 | 未打卡、待确认、已提交、已撤回 |
| 我的记录 | 员工 | 日历/列表、补卡、撤回、修正痕迹 | 正常、补卡、已修正、无效 |
| 排行榜 | 员工/管理员 | 周榜、活动榜、规则说明、个人排名 | 生成中、已生成、无数据 |
| AI 教练 | 员工 | 群外咨询入口、免责声明、高风险提示 | 普通、谨慎、风险升级 |
| 运营看板 | 管理员 | 打卡人数、完成率、趋势、未打卡人数 | 今日、周、活动周期 |
| 打卡管理 | 管理员 | 搜索筛选、详情、修正、作废、审计 | 待确认、有效、无效 |
| 提醒任务 | 管理员 | 未打卡名单、发送状态、失败原因、重试 | 待发送、已发送、跳过、失败、人工处理 |
| 活动配置 | 管理员 | 周期、规则、补卡、排行榜、提醒时间 | 草稿、启用、暂停、结束 |
| 企业微信配置 | 企业管理员 | webhook、自建应用、OAuth、成员同步 | 未配置、待验证、可用、失败 |

### 前端状态与交互

- 打卡提交后先展示识别结果，不直接提交正式记录。
- 排行榜页面必须展示排序规则说明。
- 管理员作废记录时必须填写原因。
- 企业微信配置页面必须提供“测试发送”与“权限检查”按钮。
- 图片入口在 MVP 可显示为受控入口：未启用时解释“图片识别待管理员开启”，不得暗示已可用。

## Backend Services

### API 分组

- `POST /api/auth/wecom/callback`：企业微信 OAuth 回调。
- `GET /api/me`：当前用户、角色、企业微信映射。
- `GET /api/activities/current`：当前活动。
- `POST /api/checkins/recognize`：提交文本或图片元数据，生成识别结果。
- `POST /api/checkins/:id/submit`：确认打卡。
- `PATCH /api/checkins/:id`：员工修正未提交或允许窗口内记录。
- `POST /api/checkins/:id/withdraw`：撤回。
- `POST /api/admin/checkins/:id/invalidate`：管理员作废。
- `GET /api/leaderboards/current`：当前排行榜。
- `POST /api/admin/leaderboards/rebuild`：重新生成排行榜快照。
- `GET /api/admin/reminders`：提醒任务列表。
- `POST /api/admin/reminders/:id/retry`：重试发送。
- `POST /api/coach/advice`：Web AI 咨询。
- `POST /api/wecom/group-bot`：群机器人回调入口或内部处理入口。
- `POST /api/admin/wecom/test-message`：企业微信测试发送。

### API 到页面的映射

| 页面动作 | API | 后端模块 | 数据变化 |
| --- | --- | --- | --- |
| 打开今日打卡 | `GET /api/activities/current`、`GET /api/me` | `activities`、`auth` | 不变 |
| 提交文本识别 | `POST /api/checkins/recognize` | `checkins`、`ai` | 创建 `checkins=recognized` 和 `recognition_results` |
| 确认提交 | `POST /api/checkins/:id/submit` | `checkins` | 更新为 `submitted` |
| 查看排行榜 | `GET /api/leaderboards/current` | `leaderboards` | 读取快照 |
| 作废打卡 | `POST /api/admin/checkins/:id/invalidate` | `admin`、`audit` | 更新为 `invalid`，写审计 |
| 重试提醒 | `POST /api/admin/reminders/:id/retry` | `reminders`、`wecom` | 更新提醒任务状态 |
| 测试企业微信 | `POST /api/admin/wecom/test-message` | `wecom`、`audit` | 写发送结果和审计 |

### 关键 API 契约示例

#### 文本识别请求

```http
POST /api/checkins/recognize
Content-Type: application/json

{
  "activityId": "act_2026_summer",
  "sourceType": "text",
  "text": "晚上慢跑 30 分钟，大概 5 公里，有点累"
}
```

响应：

```json
{
  "checkinId": "chk_001",
  "status": "recognized",
  "recognition": {
    "sportType": "running",
    "durationMin": 30,
    "distanceKm": 5,
    "intensity": "moderate",
    "calorieEstimate": 260,
    "confidence": 0.82,
    "notice": "未提供体重，热量使用默认参数估算，仅供活动统计参考"
  }
}
```

#### 确认提交请求

```http
POST /api/checkins/chk_001/submit
Content-Type: application/json

{
  "sportType": "running",
  "durationMin": 30,
  "distanceKm": 5,
  "intensity": "moderate",
  "calorieEstimate": 260
}
```

#### 企业微信测试发送

```http
POST /api/admin/wecom/test-message
Content-Type: application/json

{
  "configId": "wecom_cfg_001",
  "messageType": "daily_tip",
  "previewText": "今天试试 20 分钟快走，记得热身和补水。"
}
```

### 服务职责

- `CheckinService`：状态流校验、提交、修正、撤回、作废。
- `RecognitionService`：解析文本/图片元数据，保存识别结果。
- `LeaderboardService`：按规则计算有效记录和快照。
- `ReminderService`：生成未打卡任务，处理发送状态。
- `WeComService`：token 管理、消息发送、webhook 验签。
- `CoachService`：健康咨询分类、提示词组装、拒答模板。
- `AuditService`：记录管理员修正、作废、配置变更和敏感查看。

### 错误处理

- 业务错误返回稳定错误码，例如 `CHECKIN_ALREADY_SUBMITTED`、`ACTIVITY_NOT_ACTIVE`、`WECOM_PERMISSION_MISSING`。
- 企业微信发送失败进入重试队列，超过阈值标记 `failed` 并保留失败原因。
- AI 解析失败时允许用户手工填写，不阻塞打卡。

## Enterprise WeCom Integration

### 企业微信智能机器人

Open Fit 面向员工提供两个企业微信智能机器人入口：`Open Fit 打卡助手` 和 `Open Fit AI 教练`。打卡助手只负责打卡、补图、确认提交和打卡状态；AI 教练负责训练建议、活动规则、活动信息和排行榜查询。

本阶段不再使用单机器人承载所有能力。原因是打卡会写入数据库，误判成本高；“跑步 30 分钟后膝盖疼怎么办”这类消息同时包含运动事实和咨询意图，如果单机器人自动分流，容易把咨询误入库。双机器人用入口本身提供业务上下文，更容易解释和验证。

智能机器人入站链路：

1. API 服务启动时读取 `WECOM_CHECKIN_BOT_ID`、`WECOM_CHECKIN_BOT_SECRET`、`WECOM_COACH_BOT_ID`、`WECOM_COACH_BOT_SECRET`。
2. `WeComStreamBotService` 使用官方 Node SDK `@wecom/aibot-node-sdk` 建立企业微信 WebSocket 长连接；SDK 负责认证、心跳和重连。
3. SDK 收到 `message.text`、`message.image` 或 `message.mixed` 后，适配层归一化为 `text + attachments[]` 和 `botRole=checkin|coach`。
4. 归一化事件继续调用 `WeComBotService.handleEvent()`，由业务服务按企业微信 `userid` 完成本地成员映射；首次出现的真实 `userid` 自动创建员工档案，缺少 `userid` 时拒绝匿名入库。
5. `WeComStreamBotService` 使用 SDK `replyStream` 将业务回复发回企业微信。
6. 打卡助手收到文字 + 图片时，文字优先调用 `CheckinsService` 生成 `recognized` 待确认记录，并关联图片附件；只收到图片时，调用 AI 图片识别生成待确认记录。
7. 打卡助手收到纯文字时不创建打卡，提示补发图片；确认意图将最近一条带 active 图片附件的待确认记录提交为 `submitted`。
8. AI 教练意图先经过健康安全围栏；高风险内容使用拒答模板且不调用模型，低风险内容调用 OpenAI-compatible 真实模型，并通过系统提示词约束为低风险、非医疗建议。
9. 回复内容只包含本人打卡结果、公开规则或低风险建议，不在群内公开未打卡名单、健康咨询原文或敏感备注。

企业微信联调约定：第一阶段预留长连接配置 `WECOM_CHECKIN_BOT_ID`、`WECOM_CHECKIN_BOT_SECRET`、`WECOM_COACH_BOT_ID`、`WECOM_COACH_BOT_SECRET`、`WECOM_INTELLIGENT_BOT_WS_URL`。后台群推送通过打卡助手智能机器人长连接主动发送，目标群 `chatid` 来自群内 @ 打卡助手消息。开发阶段不提交真实值，联调时由用户替换 `.env`。

### 群机器人

- 用途：每日 9 点健康小贴士、每周排行榜卡片、测试发送、降级公告。
- 配置：每个活动可绑定一个或多个群机器人 webhook。
- 安全：webhook key 存入服务端密钥配置，不入库明文；数据库只保存配置别名和加密引用。
- 降级：群机器人不可用时，记录发送失败并在管理员提醒任务中展示。

### 接入步骤

1. 企业微信管理员创建群机器人，复制 webhook key。
2. 企业管理员在 Web 工作台新增群机器人配置，只保存密钥引用。
3. 后端通过 `POST /api/admin/wecom/test-message` 发送测试消息。
4. 测试成功后，将机器人绑定到活动。
5. worker 在小贴士、周榜任务中调用 `WeComService` 发送群消息。
6. 发送失败写入任务状态和失败原因，管理员可在 Web 查看。

### 自建应用

- 用途：OAuth 登录、成员 userid 映射、个人未打卡提醒。
- Token：worker 定时刷新或发送前懒加载，缓存到 Redis，过期自动刷新。
- 可信域名：Web 登录和回调路径必须配置到企业微信后台。
- 降级：自建应用消息不可用时，提醒任务状态置为 `manual`，管理员可导出或在 Web 看板处理。

自建应用接入的最低权限闭环：

1. 配置 `corp_id`、`agent_id`、`secret` 的密钥引用。
2. 配置可信域名和 OAuth 回调地址。
3. 通过 OAuth 获取员工身份并绑定 `members.wecom_userid`。
4. 测试向指定 userid 发送应用消息。
5. 权限不足时不阻塞打卡，将个人提醒任务降级为 `manual`。

### 成员同步

- MVP 支持机器人首次消息自动建档、Excel userid 名册导入成员；具备通讯录权限时可扩展企业微信通讯录 API 同步。
- `members.wecom_userid` 是优先身份键；自动建档成员先使用企业微信 `userid` 作为 `external_id`，显示名和部门可由管理员补全或后续通讯录同步覆盖。

## AI Service Design

### 文本打卡解析

输入：“晚上慢跑 30 分钟，大概 5 公里，有点累。”

输出结构：

- 运动类型：跑步
- 时长：30 分钟
- 距离：5 公里
- 强度：中等
- 估算热量：仅供参考
- 置信提示：来自用户文本，未提供体重，使用默认参数

### 图片识别扩展

- MVP 不强制启用。
- 数据模型保留 `attachments`、`recognition_results.source_type=image`。
- 启用前必须确认原图保存、缩略图、删除、访问控制和模型供应商。

### 健康咨询安全分类

- `normal`：普通运动、饮食、健康知识。
- `caution`：不确定或涉及个人身体情况，回答保守并加免责声明。
- `escalate`：胸痛、呼吸困难、晕厥、急性损伤、药物、孕产、术后、慢性病急性发作、极端减重；拒绝诊断并建议专业帮助。

### 本地轻量安全围栏

- Prompt Injection：使用 `@andersmyrmel/vard` 检测 instruction override、role manipulation、system prompt leak、delimiter injection 和 encoding；Open Fit 额外维护中文规则，覆盖“忽略之前规则”“泄露系统提示词”“你现在是医生/管理员”“绕过安全限制”等表达。
- 内容安全：使用 `sensitive-word-tool` 做本地 DFA 敏感词检测，内置一批违禁/敏感词，并通过 `LOCAL_GUARDRAIL_EXTRA_WORDS` 支持企业自定义词。
- 隐私与密钥：使用本地正则检测手机号、身份证号、邮箱、`sk-` API key、token、secret 等，不保存完整咨询原文。
- 健康边界：对胸痛、呼吸困难、晕厥、药物、孕产、术后、慢性病急性发作和极端减重等场景直接拒答并建议专业帮助。
- 输出校验：真实模型输出必须再次通过本地安全围栏，命中风险时返回安全替代回复。

## Data Model

### 核心表

| 表 | 关键字段 | 说明 |
| --- | --- | --- |
| `organizations` | `id`、`name`、`wecom_corp_id`、`created_at` | 企业主体。 |
| `members` | `id`、`org_id`、`wecom_userid`、`external_id`、`display_name`、`department`、`role`、`status` | 员工与企业微信身份映射。 |
| `activities` | `id`、`org_id`、`name`、`start_at`、`end_at`、`status`、`rule_json`、`reminder_time` | 活动周期和规则。 |
| `checkins` | `id`、`activity_id`、`member_id`、`status`、`source_type`、`sport_type`、`duration_min`、`distance_km`、`intensity`、`calorie_estimate`、`is_makeup`、`submitted_at` | 正式或待确认打卡。 |
| `recognition_results` | `id`、`checkin_id`、`input_text`、`source_type`、`result_json`、`confidence`、`model_name`、`status` | AI/规则解析结果。 |
| `attachments` | `id`、`checkin_id`、`local_path`、`public_path`、`mime_type`、`size_bytes`、`status`、`expires_at` | 图片或附件扩展，MVP 使用本地路径引用。 |
| `leaderboard_snapshots` | `id`、`activity_id`、`period_start`、`period_end`、`rule_version`、`status`、`generated_at` | 排行榜快照。 |
| `leaderboard_entries` | `id`、`snapshot_id`、`member_id`、`rank`、`score`、`checkin_days`、`duration_min`、`calorie_estimate` | 排行榜条目。 |
| `reminder_tasks` | `id`、`activity_id`、`member_id`、`remind_date`、`channel`、`status`、`attempt_count`、`last_error` | 未打卡提醒任务。 |
| `coach_advice_logs` | `id`、`member_id`、`channel`、`risk_level`、`risk_tags`、`question_hash`、`response_summary`、`created_at` | 咨询审计，不默认保存完整敏感原文。 |
| `wecom_configs` | `id`、`org_id`、`bot_name`、`webhook_secret_ref`、`agent_id`、`status` | 企业微信配置引用。 |
| `audit_logs` | `id`、`actor_id`、`action`、`target_type`、`target_id`、`detail_json`、`created_at` | 审计。 |

### 状态枚举

- `checkins.status`：`draft`、`recognized`、`submitted`、`corrected`、`withdrawn`、`invalid`。
- `activities.status`：`draft`、`active`、`paused`、`ended`。
- `reminder_tasks.status`：`pending`、`eligible`、`sent`、`skipped`、`failed`、`manual`。
- `recognition_results.status`：`pending`、`succeeded`、`failed`、`confirmed`、`discarded`。

### 索引建议

- `members(org_id, wecom_userid)` 唯一索引，允许 `wecom_userid` 为空时使用部分索引。
- `checkins(activity_id, member_id, submitted_at)` 支持个人记录和活动统计。
- `checkins(activity_id, status, submitted_at)` 支持排行榜过滤。
- `reminder_tasks(activity_id, remind_date, status)` 支持提醒任务扫描。
- `leaderboard_entries(snapshot_id, rank)` 支持榜单展示。
- `audit_logs(actor_id, created_at)` 支持审计追踪。

### 打卡状态生命周期

```text
draft
  员工正在填写，尚未提交识别。

recognized
  系统已生成 AI/规则识别结果，等待员工确认。

submitted
  员工确认后的有效打卡，可进入统计和排行榜。

corrected
  员工或管理员修正过，仍可能是有效记录。

withdrawn
  员工在规则允许范围内撤回，不进入有效统计。

invalid
  管理员作废，不进入有效统计，必须有原因和审计。
```

### 本地文件存储约定

- 上传根目录由 `LOCAL_STORAGE_ROOT` 指定，例如 `./storage/uploads`。
- 文件按组织、活动和日期分层，例如 `org_001/act_001/2026-07-10/file-id.jpg`。
- 数据库保存相对路径 `local_path`，不保存绝对磁盘路径。
- 访问文件必须通过后端鉴权路由，例如 `GET /api/files/:attachmentId`。
- 删除图片时先标记附件状态，再由清理任务删除磁盘文件，避免请求中断造成状态不一致。

## End-to-End Flows

### 文本打卡

1. 员工进入“今日打卡”。
2. 输入文本运动内容。
3. 前端调用 `POST /api/checkins/recognize`。
4. 后端创建 `checkins.status=recognized` 和 `recognition_results`。
5. 前端展示结构化结果和估算说明。
6. 员工确认后调用 `POST /api/checkins/:id/submit`。
7. 后端校验活动、重复打卡、补卡窗口，写入 `submitted`。
8. 排行榜可异步重建或按周期快照更新。

### 未打卡提醒

1. worker 每天按活动 `reminder_time` 触发。
2. 查询活动成员与当天有效打卡记录。
3. 生成 `reminder_tasks`。
4. 自建应用可用时发送个人消息并标记 `sent`。
5. 发送失败重试，超过阈值标记 `failed`。
6. 自建应用不可用时标记 `manual`，管理员在 Web 查看。

### 周榜推送

1. worker 每周生成 `leaderboard_snapshots`。
2. `LeaderboardService` 写入 `leaderboard_entries`。
3. `WeComService` 组装群机器人 markdown/card 消息。
4. 发送成功记录审计；失败进入重试或管理员处理。

### 群内健康咨询

1. 企业微信群成员 @ 机器人。
2. 后端接收消息或内部转发文本。
3. `CoachService` 先做风险分类。
4. `normal/caution` 调用 AI 生成低风险建议。
5. `escalate` 使用拒答模板，不调用开放式诊断回答。
6. 回复包含非医疗边界；审计保存风险标签和摘要。

### 管理员作废异常打卡

1. 管理员在“打卡管理”中筛选异常记录。
2. 查看员工提交内容、识别结果、修正痕迹和活动规则。
3. 点击作废并填写原因。
4. 后端将 `checkins.status` 更新为 `invalid`。
5. `audit_logs` 记录操作者、目标记录、原因和时间。
6. 下次排行榜重算时自动排除该记录。

### 企业微信权限不可用降级

1. 系统在提醒时间生成未打卡提醒任务。
2. `WeComService` 检测自建应用消息不可用。
3. 提醒任务标记为 `manual`。
4. 管理员在“提醒任务”页面查看待人工处理名单。
5. 后续权限开通后，可批量重试或切换为自动发送。

## Security / Privacy / Compliance

- 密钥只通过环境变量、密钥管理或加密引用保存。
- 群消息不得展示原始图片、健康咨询原文、敏感备注或未打卡名单。
- 管理员查看、作废、修正记录必须写入 `audit_logs`。
- 图片启用前必须具备删除策略、过期策略和访问控制；MVP 本地存储必须禁止直接暴露上传目录，只能通过鉴权后的后端文件路由读取。
- 健康咨询日志默认不保存完整原文；如需保存，必须明确保留期限和访问角色。
- AI 回复必须始终带有非医疗建议边界；高风险场景必须建议专业帮助。

## Operations

- 开发环境：Docker Compose 启动 PostgreSQL、Redis、api-server、worker、web-workbench，并挂载本地上传目录。
- 环境变量：`DATABASE_URL`、`REDIS_URL`、`WECOM_CHECKIN_BOT_ID`、`WECOM_CHECKIN_BOT_SECRET`、`WECOM_COACH_BOT_ID`、`WECOM_COACH_BOT_SECRET`、`WECOM_INTELLIGENT_BOT_WS_URL`、`AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`、`LOCAL_STORAGE_ROOT`、`LOCAL_GUARDRAIL_MAX_INPUT_LENGTH`、`LOCAL_GUARDRAIL_EXTRA_WORDS`。
- 任务调度：BullMQ repeatable jobs 管理每日小贴士、提醒、周榜。
- 日志：结构化 JSON 日志，包含 `request_id`、`member_id`、`activity_id`、`job_id`。
- 监控：任务失败数、企业微信发送失败率、AI 调用失败率、打卡提交成功率。
- 备份：PostgreSQL 每日备份；本地上传目录按图片策略做定期备份和过期清理。
- 回滚：数据库迁移必须可回滚或具备向前修复脚本；任务发送需幂等。

## Alternatives Considered

### 方案一：微服务 + Kubernetes

适合成熟平台，但 MVP 运维成本高、开发节奏慢。当前不推荐。

### 方案二：无后端 BaaS + 前端直连

可以快速出原型，但企业微信 token、AI 密钥、调度任务和审计都不适合放在前端或弱后端中。当前不推荐。

### 方案三：模块化单体 + 队列 worker

推荐。既能清晰拆分业务边界，又避免过早微服务化。后续可按 `wecom`、`ai`、`leaderboards`、`reminders` 模块拆分。

## Risks

- 企业微信权限不足会影响 OAuth、成员同步和个人提醒。
- 排行榜规则若未确认，可能造成后续统计口径返工。
- 图片能力若提前启用，会引入隐私和存储治理风险。
- AI 健康咨询若缺少分类和拒答，会带来安全风险。
- 单体模块边界若不清晰，后续拆分成本会上升。

## MVP Acceptance Criteria

- 员工能完成一次文本打卡，从输入、识别、确认到有效记录保存。
- 管理员能看到今日打卡率、未打卡人数和排行榜。
- 排行榜只统计 `submitted` 和仍有效的 `corrected` 记录。
- 群机器人能发送测试小贴士或周榜消息。
- 自建应用不可用时，未打卡提醒能降级为 Web 看板 manual 任务。
- AI 健康咨询对胸痛、晕厥、急性损伤、药物、孕产、极端减重等问题拒绝诊断并建议专业帮助。
- 本地文件不能通过静态目录直接公开访问，必须走后端鉴权路由。

## Migration / Rollout

1. 方案确认：确认技术栈、企业微信权限、排行榜规则和图片策略。
2. 基础设施：搭建 Vue 3 + Vite、Node.js + NestJS、PostgreSQL、Redis、Prisma、Docker Compose 和本地上传目录。
3. 核心闭环：实现成员、活动、文本打卡、确认、排行榜。
4. 企业微信：接入群机器人、小贴士、周榜；再接自建应用 OAuth 和个人提醒。
5. AI 安全：上线文本解析、健康咨询分类、拒答模板和免责声明。
6. 增强：图片识别、管理员仪表盘深化、活动配置增强。

## Validation Matrix

| 能力 | 验证方式 | 类型 | 通过标准 | 证据 |
| --- | --- | --- | --- | --- |
| 文本打卡 | API/服务测试 | 自动 | 识别、确认、修正、撤回、作废状态正确 | 测试输出 |
| 排行榜 | 固定数据测试 | 自动 | 排序、平局、无效记录过滤正确 | 测试输出 |
| 提醒任务 | worker 测试 | 自动 | 生成、发送、跳过、失败、manual 状态正确 | 测试输出 |
| 企业微信群机器人 | 测试 webhook | 人工/自动 | 小贴士和周榜消息格式正确 | 截图或日志 |
| 自建应用消息 | 测试企业微信应用 | 人工 | 可向指定 userid 发送提醒 | 截图或日志 |
| AI 健康安全 | 风险样例集 | 自动 | 高风险问题拒答并建议专业帮助 | 测试输出 |
| 隐私展示 | 页面/API 检查 | 自动/人工 | 群榜不含图片、咨询原文、未打卡名单 | 截图或测试 |
| 知识库回写 | 文档检查 | 人工 | 长期规则写入 `docs/知识库/` | git diff |
## AI 教练多轮会话上下文

`Open Fit AI 教练` 支持短期多轮追问，采用“最近消息窗口 + 滚动摘要”的方案。服务端按 `orgId + chatId + wecomUserid` 定位群聊会话，单聊没有 `chatId` 时按 `orgId + wecomUserid` 定位，确保同一群内不同员工的健康咨询不会串上下文。

会话数据由 `CoachConversation` 和 `CoachConversationMessage` 保存。每次低风险问题通过输入安全围栏后，系统读取会话摘要和最近 10 条消息，与当前问题一起传入 OpenAI-compatible `messages[]`。模型输出仍需经过输出安全围栏；只有通过输出安全围栏的回答才会写入会话历史。用户可发送“清空上下文”“清除上下文”“重新开始”或“新话题”重置当前会话。

该能力只对 AI 教练机器人生效。打卡助手不读取 AI 教练上下文，也不把打卡内容作为咨询上下文，避免历史聊天影响打卡入库。
