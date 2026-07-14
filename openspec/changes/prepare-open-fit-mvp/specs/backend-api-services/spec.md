## ADDED Requirements

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
