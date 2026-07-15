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
后端 SHALL 提供活动列表和活动内容保存 API，并让企业微信 AI 教练在活动规则查询意图下读取 active 活动的活动内容。

#### Scenario: 查询活动列表
- **WHEN** Web 调用 `GET /api/activities/configs`
- **THEN** API SHALL 返回当前组织的活动列表
- **AND** API SHALL NOT 依赖独立 `ActivityRule` 表

#### Scenario: 新增活动配置
- **WHEN** Web 调用 `POST /api/activities/configs` 并提交活动名称、活动周期和活动内容
- **THEN** API SHALL 为当前组织创建一条 `draft` 活动
- **AND** API SHALL 将活动周期保存到 `Activity.startAt` 和 `Activity.endAt`
- **AND** API SHALL 将活动内容保存到 `Activity.ruleJson.content`
- **AND** API SHALL 返回可用于活动列表展示的活动配置 DTO

#### Scenario: 保存活动周期
- **WHEN** Web 调用 `PUT /api/activities/{id}/config` 并提交开始日期和结束日期
- **THEN** API SHALL 更新活动周期
- **AND** 当结束日期早于开始日期时 API SHALL 拒绝保存并返回明确错误

#### Scenario: AI 教练查询活动规则
- **WHEN** 企业微信 AI 教练收到活动规则查询
- **THEN** 后端 SHALL 查询当前组织 active 活动的 `ruleJson.content`
- **AND** 回复 SHALL 包含活动名称和活动内容
- **AND** 后端 SHALL NOT 使用硬编码活动说明替代后台规则

### Requirement: 企业微信成员信息补全
后端 SHALL 使用企业微信入站消息中的 `from.userid` 识别成员；当 userid 首次出现且配置了通讯录凭据时，后端 SHALL 调用企业微信通讯录接口补全成员姓名和部门。

#### Scenario: 未知 userid 自动建档
- **WHEN** 企业微信机器人收到未知 `userid` 的消息
- **THEN** 后端 SHALL 创建本地成员档案并继续处理本次消息
- **AND** 如果 `WECOM_CORP_ID` 和 `WECOM_APP_SECRET` 已配置，后端 SHALL 调用企业微信 access token 和成员详情接口补全 `displayName` 与 `department`
- **AND** 如果企业微信接口不可用或未配置，后端 SHALL 降级使用 userid 生成显示名，不得阻塞消息处理

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
- **WHEN** Web 调用 `GET /api/admin/members?missingToday=true`
- **THEN** API SHALL 返回当前活动下今日没有 `submitted` 或 `corrected` 有效打卡的 active 成员

#### Scenario: 查询成员打卡明细
- **WHEN** Web 调用 `GET /api/admin/members/:id/checkins`
- **THEN** API SHALL 返回成员信息和该成员最近打卡记录

#### Scenario: 恢复作废打卡
- **WHEN** 管理员调用 `POST /api/admin/checkins/:id/restore`
- **THEN** API SHALL 将 `invalid` 打卡恢复为最近一次作废审计记录中的 previousStatus
- **AND** 如果没有 previousStatus，API SHALL 恢复为 `submitted`
- **AND** API SHALL 写入 `checkin.restore` 审计日志

#### Scenario: 群提醒未打卡
- **WHEN** 管理员调用 `POST /api/admin/reminders/group-missing-checkins`
- **THEN** API SHALL 统计今日未打卡人数并通过群机器人发送提醒
- **AND** 群消息 SHALL NOT 公开未打卡成员名单

#### Scenario: 今日运营看板
- **WHEN** Web 调用 `GET /api/admin/dashboard/summary`
- **THEN** API SHALL 按当天时间范围统计今日打卡人数、未打卡人数、总人数和打卡率

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

### Requirement: 稳定业务错误码

后端 SHALL 为常见业务失败返回稳定错误码，便于前端展示明确状态和后续测试。

#### Scenario: 重复打卡

- **WHEN** 员工在不允许重复提交的活动日再次提交
- **THEN** API 必须返回稳定错误码，例如 `CHECKIN_ALREADY_SUBMITTED`
