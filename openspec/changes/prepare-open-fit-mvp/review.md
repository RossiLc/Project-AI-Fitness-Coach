# Review

## Readiness Decision

ready with conditions

当前方案已经具备进入实现型 OpenSpec 变更的基础，但正式编码前仍需确认企业微信权限、图片保存策略、排行榜最终规则和健康咨询日志策略。若这些未确认项无法在实现前解决，相关能力必须按设计中的降级路径推进。

针对当前第一阶段目标，允许在以下条件下启动实现：

- 企业微信智能机器人 Bot ID/Secret 配置后必须建立 SDK 长连接；目标群已 @ 打卡助手并捕获 `chatid` 后，必须能通过长连接发送测试群消息。
- 企业微信自建应用 OAuth、userid 和应用消息权限未确认时，不阻塞第一阶段，但必须保留接口边界和 Web 配置骨架。
- 排行榜最终规则未确认时，不阻塞第一阶段；第一阶段只展示 seed/示例榜单和规则说明占位。
- 图片策略未确认时，不阻塞第一阶段；第一阶段只创建本地存储目录和鉴权访问占位，不实现真实图片识别。
- 健康咨询日志策略未确认时，不阻塞第一阶段；第一阶段 AI 教练页面只做占位，不保存咨询原文。

## Key Findings

- 原 `prepare-open-fit-mvp` 设计深度不足，已升级为 `solution-architecture` 级方案。
- 推荐技术栈为 Vue 3、Vite、TypeScript、Node.js、NestJS、PostgreSQL、Redis/BullMQ、Prisma、本地磁盘存储和 Docker Compose。
- 后端采用模块化单体，避免 MVP 阶段过早微服务化，同时保留模块拆分边界。
- Web 工作台必须覆盖员工端、活动管理员端和企业管理员端，而不是只有打卡页面。
- 企业微信接入必须同时设计群机器人、自建应用、OAuth、userid 映射和降级路径。
- 数据模型必须先覆盖核心表、状态、索引和隐私策略，再进入迁移实现。
- AI 能力必须分为文本打卡解析、图片识别扩展和健康咨询安全分类。

## Required Clarifications

- 企业微信自建应用、通讯录 userid、OAuth 可信域名和应用消息权限是否可用？
- MVP 是否确认采用推荐技术栈；如果不用 Vue 3、Node.js/NestJS 或 PostgreSQL，需要替换方案。
- 排行榜主指标是否采用“有效打卡天数 + 累计运动时长”？
- 图片原图是否保存；若保存，保留多久、谁能访问、如何删除？
- 健康咨询日志是否保存完整原文；若保存，访问角色和保留期限是什么？

## Blocked By

- 自建应用权限未确认：阻塞个人定向提醒和企业微信 OAuth 登录的生产实现，但不阻塞第一阶段 mock auth 与群机器人测试发送。
- 图片策略未确认：阻塞真实图片上传与识别，但不阻塞第一阶段本地存储骨架。
- 排行榜规则未确认：阻塞生产排行榜口径，但不阻塞第一阶段示例榜单和 dashboard 骨架。
- 健康咨询日志策略未确认：阻塞真实 AI 咨询日志保存，但不阻塞第一阶段 AI 教练占位。

## Validation Focus

- VF-方案覆盖：确认设计包含技术选型、前端、后端、企业微信、AI、数据模型、流程、部署、安全和验证矩阵。
- VF-前端工作台：确认员工、活动管理员、企业管理员页面和关键状态完整。
- VF-后端 API：确认打卡、排行榜、提醒、企业微信、AI 和管理员操作 API 可映射。
- VF-数据模型：确认核心表、字段、状态、索引和隐私策略可支持流程。
- VF-企业微信：确认群机器人、自建应用消息、OAuth、userid 映射和降级路径。
- VF-AI 安全：确认文本解析、健康咨询分类、拒答和免责声明。
- VF-运维部署：确认 Docker Compose、环境变量、任务调度、日志和回滚策略。
- VF-知识库回写：确认技术栈和方案级门禁写回长期知识库。

## Solution Coverage Gate

| 覆盖项 | 状态 | 说明 |
| --- | --- | --- |
| 技术选型 | 已覆盖 | 推荐栈、备选方案和取舍已写入 `design.md`。 |
| 前端工作台 | 已覆盖 | 员工、管理员、企业管理员页面和状态已定义。 |
| 后端服务 | 已覆盖 | 模块边界、API 分组、任务、错误码已定义。 |
| 企业微信集成 | 已覆盖 | 群机器人、自建应用、OAuth、成员同步、降级已定义。 |
| AI 服务 | 已覆盖 | 文本解析、图片扩展、健康安全分类已定义。 |
| 数据模型 | 已覆盖 | 核心表、状态枚举、索引建议已定义。 |
| 端到端流程 | 已覆盖 | 打卡、提醒、周榜、咨询流程已定义。 |
| 安全隐私 | 已覆盖 | 密钥、群消息、图片、咨询日志、审计已定义。 |
| 部署运维 | 已覆盖 | Docker Compose、环境变量、日志、监控、备份、回滚已定义。 |
| 验证矩阵 | 已覆盖 | 自动/人工验证、通过标准和证据已定义。 |

## Superpowers Recommendation

using-git-worktrees + writing-plans + test-driven-development + subagent-driven-development + verification-before-completion

第一阶段实现建议先用 `using-git-worktrees` 隔离脏工作区，再按 `plan.md` 使用 `subagent-driven-development` 或 `executing-plans` 分任务推进。打卡状态流、企业微信发送服务、mock auth 和 API 契约应使用 `test-driven-development`；完成前用 `verification-before-completion` 保留测试、日志或截图证据。

## Review Request

实现前建议进行一次产品、企业微信管理员、前端、后端、隐私安全联合评审，确认技术栈、企业微信权限、图片策略、排行榜规则和日志保留策略。

## Delegation Mode

subagent-eligible

可按前端工作台、后端服务、数据模型、企业微信接入、AI 安全和部署验证拆分。

## Parallelization Mode

parallel-eligible

前端信息架构、数据模型、企业微信权限验证和 AI 安全样例可并行；代码实现阶段需以数据模型和认证方案为先。

## Worktree Mode

same-tree

当前只更新方案产物和 workflow schema，不需要隔离 worktree。实现阶段建议创建 `codex/prepare-open-fit-mvp` 或同名分支。

## Branch Finish Mode

standard

实现完成后按项目 Git 工作流提交、PR 或归档。

## Key Risks

- 如果推荐技术栈被替换但 OpenSpec 未同步，后续计划会失真。
- 企业微信权限不可用可能导致个人提醒、OAuth 和成员同步降级。
- 图片策略不清晰时启用图片能力会产生隐私风险。
- 健康咨询日志保存过多原文会增加敏感数据风险。
- 模块化单体如果边界执行不到位，会退化成难维护的大模块。
