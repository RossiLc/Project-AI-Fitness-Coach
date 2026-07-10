## ADDED Requirements

### Requirement: 文本打卡 MVP 优先

Web 平台 SHALL 将文本运动打卡作为 MVP 必交付能力，允许员工输入运动项目、时长、距离、强度和备注，并生成待确认记录。

#### Scenario: 员工提交文本运动内容

- **WHEN** 员工输入“今天快走 40 分钟，大概 4 公里”
- **THEN** 系统必须生成包含运动类型、时长、距离、强度、备注和估算热量的待确认记录

### Requirement: AI 解析结果用户确认

系统 SHALL 把 AI 解析结果置于待确认状态，MUST 在员工确认或修正后才将记录计入排行榜和统计。

#### Scenario: AI 解析结果存在偏差

- **WHEN** AI 将“快走 40 分钟”识别为“跑步 40 分钟”
- **THEN** 员工必须能在提交前修正运动类型，系统保存修正后的正式记录

### Requirement: 图片打卡扩展边界

图片打卡 SHALL 在 MVP 中保留接口、状态和隐私边界，但可以作为增强能力延后实现；任何图片识别结果都 MUST 经过用户确认。

#### Scenario: MVP 暂不启用图片识别

- **WHEN** 产品决定第一版仅交付文本打卡
- **THEN** 规格必须保留图片上传、识别、确认和删除策略的扩展点，但任务计划不得把真实图片识别列为 MVP 阻塞项

### Requirement: 打卡生命周期控制

打卡记录 SHALL 支持 `draft`、`recognized`、`submitted`、`corrected`、`withdrawn` 和 `invalid` 状态，以覆盖草稿、AI 识别、正式提交、修正、撤回和管理员作废。

#### Scenario: 管理员作废异常打卡

- **WHEN** 管理员发现某条打卡明显不符合活动规则
- **THEN** 系统必须允许管理员将记录标记为 `invalid`，并从排行榜有效统计中排除

