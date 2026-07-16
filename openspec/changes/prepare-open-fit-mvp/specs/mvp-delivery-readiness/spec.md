## ADDED Requirements

### Requirement: MVP 能力分级

项目 SHALL 将后续能力分为 MVP 必交付、MVP 可选增强和暂缓能力，并在任务计划中避免把可选增强误设为阻塞项。

#### Scenario: 图片识别排期

- **WHEN** 图片识别模型、成本或隐私策略尚未确认
- **THEN** 图片识别必须被标记为可选增强或后续阶段，不得阻塞文本打卡 MVP

### Requirement: 第一阶段可运行框架

项目 SHALL 将第一阶段实现目标定义为可运行纵向框架，覆盖 Web 工作台、API 服务、worker 队列、数据库、Redis、本地文件目录、mock auth、seed 数据、文本打卡体验和企业微信机器人测试发送。

#### Scenario: 第一阶段演示

- **WHEN** 第一阶段实现完成
- **THEN** 开发者必须能启动 Web、API、worker、PostgreSQL 和 Redis，并通过 Web 体验角色切换、文本打卡、运营看板、提醒任务和企业微信测试发送

#### Scenario: 企业微信智能机器人权限尚未完整开通

- **WHEN** 企业微信智能机器人 Bot ID/Secret、入站 userid 或目标群 chatid 捕获尚未可用
- **THEN** 第一阶段必须能在配置真实智能机器人 Bot ID/Secret 后接收入站消息，并在捕获目标群 `chatid` 后通过长连接发送测试群消息

### Requirement: 阶段边界防误判

第一阶段 SHALL 不把企业微信自建应用、OAuth、通讯录同步作为后续阻塞项；当前企业微信能力边界 SHALL 收敛为智能机器人长连接、群消息、userid 身份识别和 Excel 名册导入。

#### Scenario: 验收第一阶段

- **WHEN** 第一阶段准备验收
- **THEN** 验收标准必须聚焦可运行框架、可体验闭环、企业微信触达测试和工程边界

### Requirement: 实现前门禁

项目 SHALL 在进入业务代码实现前完成产品、技术、隐私和企业微信权限四类门禁检查，并把未解决阻塞项写入 `review.md`。

#### Scenario: 企业微信智能机器人权限仍未确认

- **WHEN** 智能机器人长连接或目标群 `chatid` 捕获尚未验证
- **THEN** `review.md` 必须将企业微信群提醒标记为有条件推进，并要求保留明确错误提示

### Requirement: 验证证据保留

MVP 实现计划 SHALL 保留验证证据要求，覆盖企业微信消息、打卡状态流、排行榜计算、提醒任务、健康安全拒答和知识库回写。

#### Scenario: 完成 MVP 实现阶段

- **WHEN** 后续实现变更准备交付
- **THEN** 项目必须能提供对应验证命令、测试结果或人工验证记录

### Requirement: 知识库回写检查

每次 MVP 相关变更结束前 SHALL 检查是否产生长期有效的业务规则、架构决策、隐私策略或协作流程，并按需写回 `docs/知识库/`。

#### Scenario: 确认排行榜主指标

- **WHEN** MVP 排行榜主指标被产品和技术共同确认
- **THEN** 该规则必须写入 `docs/知识库/业务规范.md` 或相关长期知识库文档
