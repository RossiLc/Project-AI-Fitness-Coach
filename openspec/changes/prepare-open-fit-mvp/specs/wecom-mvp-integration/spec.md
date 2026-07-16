## ADDED Requirements

### Requirement: 企业微信权限预检

系统 SHALL 在 MVP 实现前确认企业微信群机器人、自建应用消息、成员 userid 获取和 Web 登录所需权限是否可用，并记录每项权限的负责人、验证方式和失败降级方案。

#### Scenario: 权限可用性检查

- **WHEN** 项目准备进入企业微信相关功能实现
- **THEN** 变更产物必须列出群机器人 webhook、自建应用 access token、成员列表或 userid 映射、Web 登录入口的可用状态和阻塞项

### Requirement: 企业微信群运营边界

企业微信群 SHALL 是运营后台的工作空间边界；后台提醒未打卡时 MUST 发送到当前选中群，并基于当前群成员计算未打卡名单。

#### Scenario: 需要发送未打卡提醒

- **WHEN** 管理员在 Web 当前群点击提醒未打卡
- **THEN** 系统必须统计该群成员当天未提交打卡的名单
- **AND** 系统必须通过该群绑定的打卡助手长连接主动推送到该群
- **AND** 消息内容必须基于未打卡成员的企业微信 userid @ 对应成员

### Requirement: 群绑定与成员初始化

系统 SHALL 通过绑定口令把 Web 后台创建的群与企业微信智能机器人入站消息中的 `chatid` 关联；系统 SHALL 支持通过中文名粘贴导入当前群成员，并用企业微信通讯录接口匹配 userid。

#### Scenario: 绑定群 chatid

- **WHEN** 管理员创建群后获得 `OF-XXXXXX` 绑定口令
- **AND** 群内成员 @ Open Fit 打卡助手发送该绑定口令
- **THEN** 系统 SHALL 保存消息中的 `chatid`
- **AND** 后续所有群提醒 SHALL 使用该 `chatid`

#### Scenario: 导入群成员

- **WHEN** 管理员粘贴群成员中文名列表
- **THEN** 系统 SHALL 调用企业微信通讯录接口匹配中文名和 userid
- **AND** 匹配成功的成员 SHALL 写入 `WeComGroupMember`
- **AND** 重名和未找到的姓名 SHALL 返回给管理员人工处理

### Requirement: 智能机器人双入口交互

系统 SHALL 面向员工暴露两个企业微信智能机器人入口：`Open Fit 打卡助手` 与 `Open Fit AI 教练`。打卡助手 MUST 只处理打卡、补图和打卡状态；AI 教练 MUST 处理训练建议、活动规则、活动信息和排行榜查询，不得创建或提交打卡记录。

#### Scenario: 群内 @ 机器人提交今日运动

- **WHEN** 员工在企业微信群中 @ Open Fit 打卡助手并发送包含文字和图片的打卡内容
- **THEN** 系统必须调用 AI 结合文字语义和图片推断运动类型、运动时长、消耗能量等字段
- **AND** 字段完整时必须直接创建 `submitted` 有效打卡、关联图片附件，并回复打卡成功摘要
- **AND** 字段不完整时不得创建打卡，必须提示员工补充缺失字段

#### Scenario: 群内 @ 打卡助手只发送文字

- **WHEN** 员工在企业微信群中 @ Open Fit 打卡助手只发送“跑步 30 分钟”一类运动文本
- **THEN** 系统不得创建正式或待确认打卡，必须提示补发图片凭证

#### Scenario: 群内 @ 打卡助手只发送图片

- **WHEN** 员工在企业微信群中 @ Open Fit 打卡助手只发送图片
- **THEN** 系统必须调用 AI 图片识别推断结构化打卡字段
- **AND** 字段完整时必须直接创建 `submitted` 有效打卡、关联图片附件，并回复打卡成功摘要
- **AND** 无法推断运动类型或运动时长时不得创建打卡，必须提示员工补充文字说明

#### Scenario: 群内 @ 机器人咨询训练建议

- **WHEN** 员工在群内 @ Open Fit AI 教练咨询低风险训练建议
- **THEN** 系统必须先通过输入安全围栏校验，再调用真实 AI Provider，并在模型输出通过输出安全围栏后返回带非医疗边界的建议；未配置模型 URL 或 key 时必须明确提示 AI 服务尚未配置

#### Scenario: 群内咨询触发提示词注入或敏感词

- **WHEN** 员工在群内 @ Open Fit AI 教练要求忽略规则、泄露系统提示词、切换越权角色，或输入违禁/敏感内容
- **THEN** 系统必须使用安全提示拒绝处理，不得调用真实 AI Provider

#### Scenario: AI 模型输出触发安全策略

- **WHEN** 真实 AI Provider 返回内容包含密钥、token、系统提示词泄漏、PII、违禁内容或健康高风险建议
- **THEN** 系统必须拦截原始输出并替换为安全提示，不得把原文发送到企业微信

#### Scenario: 群内咨询涉及高风险健康问题

- **WHEN** 员工在群内 @ Open Fit AI 教练提到胸痛、晕厥、急性损伤、药物、孕产、术后、慢性病急性发作或极端减重
- **THEN** 系统必须使用安全拒答模板，不得调用真实 AI Provider，不得给出诊断、治疗、处方或疾病管理结论

### Requirement: 智能机器人 SDK 长连接接入

系统 SHALL 使用企业微信智能机器人 SDK 长连接方式接收入站消息，配置 `Bot ID + Secret` 后即可启动连接；系统 MUST NOT 暴露智能机器人 URL 回调入口。

#### Scenario: 长连接模式启动

- **WHEN** 配置了打卡助手和 AI 教练的 Bot ID/Secret
- **THEN** 系统必须为两个智能机器人分别建立 SDK 长连接，并监听文本、图片和图文混排消息

#### Scenario: 长连接消息归一化

- **WHEN** SDK 收到 `message.text`、`message.image` 或 `message.mixed`
- **THEN** 系统必须转换为统一的 `WeComBotEventRequest`，包含 `messageId`、`fromUserId`、`botId`、`botRole`、`messageType`、`text`、`attachments` 和 `chatId`

#### Scenario: 长连接回复

- **WHEN** 业务服务完成打卡、AI 教练或活动查询处理
- **THEN** 系统必须通过 SDK `replyStream` 将回复发送回企业微信

#### Scenario: 禁止 URL 回调入口

- **WHEN** API 服务启动
- **THEN** 系统不得注册 `POST /api/wecom/intelligent-bot/events` 作为智能机器人入站入口

### Requirement: 智能机器人回调与幂等

系统 SHALL 对企业微信智能机器人长连接消息 ID 或请求 ID 做幂等处理；入站契约和服务边界必须通过 SDK 长连接适配层进入业务服务。

#### Scenario: 收到重复回调

- **WHEN** 企业微信因重试发送相同消息事件
- **THEN** 系统必须避免重复创建打卡记录，优先返回已有处理结果或稳定提示

#### Scenario: 首次出现的企业微信用户自动建档

- **WHEN** 入站消息中包含真实企业微信 `userid`，但本地还没有对应 Open Fit 成员
- **THEN** 系统必须按该 `userid` 自动创建员工成员档案，并继续处理本次机器人消息
- **AND** 如果消息来自已绑定群，系统必须把该成员记录为当前群的观察成员

#### Scenario: 缺少企业微信用户身份

- **WHEN** 入站消息缺少企业微信 `userid`
- **THEN** 系统必须返回无法识别身份的提示，不得创建匿名成员或匿名打卡
