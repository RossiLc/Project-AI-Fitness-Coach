# Tasks

## 1. 方案确认

- [ ] 1.1 确认本变更按 `solution-architecture` 级别执行。
- [ ] 1.2 确认 MVP 推荐技术栈：Vue 3、Vite、TypeScript、Node.js、NestJS、PostgreSQL、Redis/BullMQ、Prisma、本地磁盘存储、Docker Compose。
- [ ] 1.3 确认企业微信自建应用、群机器人、OAuth、userid 和消息发送权限。
- [ ] 1.4 确认排行榜主指标、平局规则、补卡窗口、撤回期限和管理员作废规则。
- [ ] 1.5 确认图片原图保存、访问角色、删除策略和 MVP 是否启用图片识别。
- [ ] 1.6 确认健康咨询日志保留字段、访问角色和保留期限。

## 2. 前端工作台设计

- [ ] 2.1 设计员工端导航、今日打卡、我的记录、排行榜和 AI 教练页面。
- [ ] 2.2 设计活动管理员端运营看板、打卡管理、排行榜管理、提醒任务和活动配置页面。
- [ ] 2.3 设计企业管理员端企业微信配置、成员映射、角色权限和系统设置页面。
- [ ] 2.4 定义关键页面的加载、空态、错误、未授权、待确认和已完成状态。

## 3. 后端服务设计

- [ ] 3.1 设计 Node.js/NestJS 模块边界：auth、members、activities、checkins、leaderboards、reminders、wecom、ai、admin、audit。
- [ ] 3.2 设计认证、活动、打卡、排行榜、提醒、企业微信、AI 教练和管理员 API。
- [ ] 3.3 设计 BullMQ worker 任务：每日小贴士、未打卡提醒、周榜快照、企业微信消息发送。
- [ ] 3.4 设计业务错误码、幂等策略、重试策略和审计记录。

## 4. 企业微信与 AI 设计

- [ ] 4.1 设计群机器人 webhook 配置、消息格式、发送失败处理和测试发送流程。
- [ ] 4.2 设计自建应用 access token、OAuth 登录、成员同步和个人提醒流程。
- [ ] 4.3 设计自建应用不可用时的 Web 看板人工处理降级路径。
- [ ] 4.4 设计 AI 文本打卡解析结构、默认参数和用户确认流程。
- [ ] 4.5 设计健康咨询 `normal`、`caution`、`escalate` 分类、拒答模板和免责声明。
- [ ] 4.6 设计图片识别扩展接口、附件表、本地文件存储和删除策略。

## 5. 数据模型设计

- [ ] 5.1 设计 `organizations`、`members`、`activities` 表。
- [ ] 5.2 设计 `checkins`、`recognition_results`、`attachments` 表。
- [ ] 5.3 设计 `leaderboard_snapshots`、`leaderboard_entries` 表。
- [ ] 5.4 设计 `reminder_tasks`、`coach_advice_logs`、`wecom_configs`、`audit_logs` 表。
- [ ] 5.5 定义状态枚举、索引、唯一约束、软删除和数据保留策略。

## 6. 后续实现任务

- [ ] 6.1 创建前后端 monorepo 或分层目录结构。
- [ ] 6.2 搭建 Vue 3 + Vite 工作台基础布局和角色路由。
- [ ] 6.3 搭建 Node.js + NestJS API、Prisma、PostgreSQL、Redis/BullMQ、本地文件存储和 worker。
- [ ] 6.4 实现成员、活动、文本打卡、识别确认和修正撤回。
- [ ] 6.5 实现排行榜计算、快照、展示和群榜推送。
- [ ] 6.6 实现提醒任务、自建应用消息和降级看板。
- [ ] 6.7 实现 AI 健康安全分类、拒答和免责声明。
- [ ] 6.8 实现企业微信配置、测试发送、OAuth 和成员同步。

## 7. 验证与收尾

- [ ] 7.1 为打卡状态流、排行榜、提醒任务和 AI 安全分类补充自动测试。
- [ ] 7.2 使用测试 webhook 或模拟器验证群机器人消息。
- [ ] 7.3 使用企业微信测试应用验证 OAuth、userid 和应用消息；不可用时记录降级证据。
- [ ] 7.4 验证 Web 页面不展示原始图片、咨询原文、敏感备注或未打卡名单。
- [ ] 7.5 运行 `openspec validate prepare-open-fit-mvp`。
- [ ] 7.6 运行 `openspec schema validate spec-driven-superpowers`。
- [ ] 7.7 将方案级 OpenSpec 门禁、技术栈决策和长期规则写回知识库。
