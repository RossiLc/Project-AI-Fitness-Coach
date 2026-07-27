## ADDED Requirements

### Requirement: 核心数据表设计

方案 SHALL 定义组织、成员、活动、打卡、识别结果、附件、排行榜快照、排行榜条目、提醒任务、健康咨询日志、企业微信配置和审计日志等核心表。

#### Scenario: 后续创建数据库迁移

- **WHEN** 开发者准备创建 Prisma schema 或数据库迁移
- **THEN** 能从方案中找到每张核心表的用途、关键字段、状态枚举和关系
- **AND** 运营推送内容 SHALL 使用独立 `PushCampaign` 表保存，不复用 `ReminderTask`
- **AND** `WeComGroup` SHALL 保存绑定群 `chatId` 和绑定消息来源机器人角色 `botRole`，用于后续主动群推送选择正确长连接通道

#### Scenario: 保存运营推送内容
- **WHEN** 管理员新增推送内容
- **THEN** `PushCampaign` SHALL 保存 `orgId`、`groupId`、`content`、`scheduleType`、`scheduleSlot`、可选 `scheduleDate`、由北京时间计划计算出的 `scheduledAt`、`status`、`lastSentAt`、`lastError`、`createdAt` 和 `updatedAt`
- **AND** `status` SHALL 支持 `draft`、`scheduled`、`sent`、`failed`、`cancelled`
- **AND** 数据模型 SHALL 支持按 `orgId + groupId + createdAt` 查询列表，并按 `status + scheduledAt` 扫描到期自动推送

### Requirement: 状态枚举与索引

数据模型 SHALL 明确打卡、活动、识别结果、提醒任务等状态枚举，并给出支持身份映射、排行榜统计和提醒扫描的索引建议。

#### Scenario: 查询当天未打卡成员

- **WHEN** worker 生成未打卡提醒任务
- **THEN** 数据模型必须具备按活动、成员、日期和有效状态查询的索引或查询路径

### Requirement: 隐私数据保留策略

数据模型 SHALL 标注图片、健康咨询日志、审计日志和企业微信密钥引用的保留与访问策略。

#### Scenario: 员工请求删除图片

- **WHEN** 员工请求删除上传图片
- **THEN** 系统必须能通过附件表定位本地文件路径，并按策略删除或标记删除
