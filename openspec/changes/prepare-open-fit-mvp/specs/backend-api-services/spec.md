## ADDED Requirements

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

