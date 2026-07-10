## ADDED Requirements

### Requirement: MVP 部署运维方案

方案 SHALL 描述开发与内网测试环境所需服务、环境变量、密钥隔离、日志、监控、备份和回滚策略。

#### Scenario: 启动测试环境

- **WHEN** 开发者准备部署 MVP 测试环境
- **THEN** 方案必须说明 Web、API、worker、PostgreSQL、Redis 和本地上传目录的启动与配置边界

### Requirement: 验证矩阵

方案 SHALL 提供覆盖文本打卡、排行榜、提醒、企业微信、AI 安全、隐私展示和知识库回写的验证矩阵。

#### Scenario: 交付前检查

- **WHEN** 后续实现准备声明完成
- **THEN** 必须能按验证矩阵逐项提供自动测试输出、日志、截图或人工验证记录

### Requirement: 知识库回写门禁

每次 MVP 相关变更结束前 SHALL 检查技术栈、架构、业务规则、隐私策略和协作流程是否产生长期稳定结论，并按需写回 `docs/知识库/`。

#### Scenario: 技术栈被确认

- **WHEN** 项目确认 Vue 3、Node.js/NestJS、PostgreSQL 和 Redis/BullMQ 为 MVP 技术栈
- **THEN** 该决策必须写入长期知识库中的基础架构或决策记录
