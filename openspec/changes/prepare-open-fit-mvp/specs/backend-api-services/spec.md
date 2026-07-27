## ADDED Requirements

### Requirement: Docker 环境数据库自动初始化
Docker 环境中的 API 服务 SHALL 在启动 NestJS 前自动确保数据库表结构和基础数据可用。

#### Scenario: reset 后启动 Docker 服务
- **WHEN** 管理员执行 `pnpm docker:reset` 删除 PostgreSQL volume 后再执行 `pnpm docker:up`
- **THEN** API 容器 SHALL 在业务服务启动前同步 Prisma schema，创建缺失表结构
- **AND** API 容器 SHALL 幂等写入基础组织、活动和企业微信配置数据
- **AND** API 容器 SHALL NOT 写入 `员工小李`、`活动管理员王姐`、`企业管理员老周` 这类演示成员
- **AND** Web 工作台 SHALL NOT 因 `public.Member`、`public.Activity` 等基础表不存在而报错

### Requirement: 活动内容 API 与 AI 教练查询
后端 SHALL 提供按群维护的活动列表和活动内容保存 API，并让企业微信 AI 教练在活动规则查询意图下优先读取当前企业微信群 active 活动的活动内容。

#### Scenario: 查询活动列表
- **WHEN** Web 调用 `GET /api/activities/configs?groupId=...`
- **THEN** API SHALL 返回当前组织当前群的活动列表
- **AND** API SHALL NOT 依赖独立 `ActivityRule` 表

#### Scenario: 新增活动配置
- **WHEN** Web 调用 `POST /api/activities/configs?groupId=...` 并提交活动名称、活动周期和活动内容
- **THEN** API SHALL 为当前组织当前群创建一条 `active` 活动
- **AND** API SHALL 将同一组织同一群原 active 活动置为 `paused`
- **AND** API SHALL 将活动周期保存到 `Activity.startAt` 和 `Activity.endAt`
- **AND** API SHALL 将活动内容保存到 `Activity.ruleJson.content`
- **AND** API SHALL 返回可用于活动列表展示的活动配置 DTO

#### Scenario: 保存活动周期
- **WHEN** Web 调用 `PUT /api/activities/{id}/config` 并提交开始日期和结束日期
- **THEN** API SHALL 更新活动周期
- **AND** 当结束日期早于开始日期时 API SHALL 拒绝保存并返回明确错误

#### Scenario: AI 教练查询活动规则
- **WHEN** 企业微信 AI 教练收到活动规则查询
- **THEN** 后端 SHALL 根据消息 `chatid` 识别当前群，并查询当前群 active 活动的 `ruleJson.content`
- **AND** 回复 SHALL 包含活动名称和活动内容
- **AND** 后端 SHALL NOT 使用硬编码活动说明替代后台规则

### Requirement: 群管理 API
后端 SHALL 将企业微信群作为运营后台的一等资源，支持创建群、绑定 chatid、导入成员和按群统计。

#### Scenario: 创建待绑定群
- **WHEN** 管理员调用 `POST /api/admin/groups` 创建企业微信群
- **THEN** API SHALL 生成唯一绑定口令
- **AND** 新群 SHALL 处于 `pending_binding` 状态

#### Scenario: 企业微信群绑定 chatid
- **WHEN** 群内成员 @ Open Fit 打卡助手或 Open Fit AI 教练并发送绑定口令
- **THEN** 后端 SHALL 将入站消息的 `chatid` 写入对应群
- **AND** 后端 SHALL 保存本次绑定消息来自的机器人角色 `botRole`
- **AND** 群状态 SHALL 变为 `active`
- **AND** 后续后台主动提醒 SHALL 使用该群 `chatid` 作为发送目标，并优先使用该群绑定时记录的机器人角色发送

#### Scenario: Excel userid 名册导入群成员
- **WHEN** 管理员上传包含 `userid`、中文名称和可选部门的 Excel 名册导入群成员
- **THEN** 后端 SHALL 按 `userid` 作为唯一身份键 upsert 本地成员档案
- **AND** 相同 `userid` SHALL 覆盖成员姓名、部门和启用状态
- **AND** 新 `userid` SHALL 新建成员并写入当前群成员关系
- **AND** 缺少 `userid` 或姓名的行 SHALL 跳过并返回行号和原因

### Requirement: 企业微信成员信息建档
后端 SHALL 使用企业微信入站消息中的 `from.userid` 识别成员；当 userid 首次出现时，后端 SHALL 仅按 userid 自动创建本地成员档案，不调用企业微信通讯录接口。

#### Scenario: 未知 userid 自动建档
- **WHEN** 企业微信机器人收到未知 `userid` 的消息
- **THEN** 后端 SHALL 创建本地成员档案并继续处理本次消息
- **AND** 新成员 SHALL 使用 userid 生成默认显示名
- **AND** 管理员后续 SHALL 通过 Excel userid 名册覆盖成员姓名和部门

### Requirement: 分类排行榜 API
后端 SHALL 支持按打卡次数、运动时长和消耗能量查询和重建排行榜。

#### Scenario: 查询分类排行榜
- **WHEN** Web 调用 `GET /api/leaderboards/current?category=duration_min`
- **THEN** API SHALL 按累计运动时长排序并返回 `category`
- **AND** `category=calorie_estimate` SHALL 按累计消耗能量排序
- **AND** 默认分类 SHALL 为 `checkin_days`

### Requirement: 单管理员后台 API
后端 SHALL 支持方案 B 的单管理员运营后台 API，并保留现有模块边界。

#### Scenario: 查询今日未打卡成员
- **WHEN** Web 调用 `GET /api/admin/members?groupId=...&missingToday=true`
- **THEN** API SHALL 返回当前群当前活动下今日没有 `submitted` 或 `corrected` 有效打卡的 active 成员

#### Scenario: 查询成员打卡明细
- **WHEN** Web 调用 `GET /api/admin/members/:id/checkins`
- **THEN** API SHALL 返回成员信息和该成员最近打卡记录

#### Scenario: 恢复作废打卡
- **WHEN** 管理员调用 `POST /api/admin/checkins/:id/restore`
- **THEN** API SHALL 将 `invalid` 打卡恢复为最近一次作废审计记录中的 previousStatus
- **AND** 如果没有 previousStatus，API SHALL 恢复为 `submitted`
- **AND** API SHALL 写入 `checkin.restore` 审计日志

#### Scenario: 群提醒未打卡
- **WHEN** 管理员调用 `POST /api/admin/reminders/group-missing-checkins?groupId=...`
- **THEN** API SHALL 统计当前群今日未打卡成员并通过该群绑定时记录的智能机器人长连接发送提醒
- **AND** 群消息 SHALL 基于未打卡成员企业微信 userid @ 对应成员

#### Scenario: 今日运营看板
- **WHEN** Web 调用 `GET /api/admin/dashboard/summary?groupId=...`
- **THEN** API SHALL 按当前群和当天时间范围统计今日打卡人数、未打卡人数、总人数和打卡率

### Requirement: 推送管理 API
后端 SHALL 提供推送管理 API，支持管理员维护运营推送内容，并通过企业微信智能机器人长连接发送到指定群。

#### Scenario: 查询推送列表
- **WHEN** Web 调用 `GET /api/admin/push-campaigns?groupId=...`
- **THEN** API SHALL 返回当前组织当前群的推送列表
- **AND** 列表 SHALL 按创建时间倒序排列

#### Scenario: 新增或编辑推送
- **WHEN** Web 调用 `POST /api/admin/push-campaigns` 或 `PUT /api/admin/push-campaigns/:id`
- **THEN** API SHALL 校验推送内容非空、目标群存在且属于当前组织
- **AND** 若提交每日推送和固定推送时段，API SHALL 按北京时间将其转换为下一次到期的 `scheduledAt`，状态 SHALL 为 `scheduled`
- **AND** 若提交指定日期推送，API SHALL 按北京时间将指定日期和固定推送时段转换为一次性 `scheduledAt`，状态 SHALL 为 `scheduled`
- **AND** 固定推送时段 SHALL 只接受 `09:00`、`12:00` 和 `18:00`
- **AND** 若选择不自动推送，状态 SHALL 为 `draft`

#### Scenario: 手动立即推送
- **WHEN** Web 调用 `POST /api/admin/push-campaigns/:id/send-now`
- **THEN** API SHALL 通过目标群绑定时记录的 Open Fit 智能机器人长连接发送推送内容
- **AND** 发送成功后 SHALL 将状态更新为 `sent`，记录最近发送时间并清空失败原因
- **AND** 目标群未绑定 chatid 或发送失败时 SHALL 将状态更新为 `failed` 并记录失败原因
- **AND** 手动立即推送失败时 API SHALL 返回非 2xx 响应，错误码为 `PUSH_CAMPAIGN_SEND_FAILED`，并在错误 detail 中包含已更新后的推送记录

#### Scenario: 删除推送计划
- **WHEN** Web 调用 `DELETE /api/admin/push-campaigns/:id`
- **THEN** API SHALL 校验该推送计划属于当前组织
- **AND** API SHALL 删除该推送计划
- **AND** 推送计划不存在或不属于当前组织时 SHALL 返回明确错误

#### Scenario: 派发到期自动推送
- **WHEN** worker 调用 `POST /api/internal/push-campaigns/dispatch-due`
- **THEN** API SHALL 扫描 `scheduledAt <= now` 且状态为 `scheduled` 的推送
- **AND** API SHALL 逐条发送并记录成功或失败状态
- **AND** 单条推送失败 SHALL NOT 中断本次到期扫描
- **AND** 每日推送成功后 SHALL 保持 `scheduled` 状态并滚动到下一天同一北京时间时段
- **AND** 指定日期推送成功后 SHALL 标记为 `sent` 并清空下一次执行时间

### Requirement: 后端 API 分组

后端 SHALL 为认证、成员、活动、打卡、排行榜、提醒、企业微信、AI 教练和管理员操作定义清晰 API 分组。

#### Scenario: 实现打卡接口

- **WHEN** 开发者实现文本打卡
- **THEN** 必须至少提供识别、确认提交、修正、撤回和管理员作废相关接口

### Requirement: 异步任务处理

系统 SHALL 使用 worker 和队列处理每日小贴士、未打卡提醒、排行榜快照和企业微信消息发送。

#### Scenario: 企业微信发送失败

- **WHEN** worker 发送企业微信消息失败
- **THEN** 系统必须记录失败原因、重试次数，并在超过阈值后标记为失败或人工处理

#### Scenario: worker 派发运营推送
- **WHEN** worker 周期扫描运营推送
- **THEN** worker SHALL 调用 API 内部到期派发接口
- **AND** worker SHALL NOT 直接依赖 API 源码模块或企业微信 webhook

### Requirement: 稳定业务错误码

后端 SHALL 为常见业务失败返回稳定错误码，便于前端展示明确状态和后续测试。

#### Scenario: 重复打卡

- **WHEN** 员工在不允许重复提交的活动日再次提交
- **THEN** API 必须返回稳定错误码，例如 `CHECKIN_ALREADY_SUBMITTED`
