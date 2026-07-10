## ADDED Requirements

### Requirement: 方案级技术选型

Open Fit MVP SHALL 明确前端、后端、数据库、缓存队列、AI 服务、文件存储和部署方式的推荐技术栈、备选方案与取舍理由。

#### Scenario: 后续实现者阅读方案

- **WHEN** 后续实现者准备创建业务代码
- **THEN** 方案必须说明推荐使用 Vue 3、Vite、Node.js、NestJS、PostgreSQL、Redis/BullMQ、Prisma、本地磁盘存储和 Docker Compose，并说明可替换方案

### Requirement: 模块化单体架构

后端 SHALL 采用模块化单体作为 MVP 默认架构，并为身份、成员、活动、打卡、排行榜、提醒、企业微信、AI、审计和管理配置定义清晰模块边界。

#### Scenario: 拆分后端任务

- **WHEN** 后续实现计划拆分后端任务
- **THEN** 每个任务必须能映射到一个明确模块，避免把企业微信、AI、打卡和统计逻辑混在同一无边界文件中

### Requirement: 运行时组件拓扑

设计 SHALL 描述 Web 工作台、API 服务、worker、PostgreSQL、Redis、本地文件存储、企业微信和 AI provider 之间的运行时关系。

#### Scenario: 部署 MVP 开发环境

- **WHEN** 开发者准备启动本地或内网测试环境
- **THEN** 方案必须能指导通过 Docker Compose 或等价方式启动依赖组件
