## ADDED Requirements

### Requirement: Agent 入口文件

项目 SHALL（必须）提供根目录 Agent 入口文件，用于说明 AI 协作工具进入项目时的必读顺序、语言约束、渐进式加载规则和需求闭环要求。

#### Scenario: Agent 开始处理项目任务

- **WHEN** Agent 进入项目并准备处理需求、设计或实现任务
- **THEN** Agent 必须先阅读入口文件，再按任务类型加载相关知识库文档和 OpenSpec 产物

### Requirement: 中文知识库目录

项目 SHALL（必须）维护中文命名的长期知识库目录，保存项目背景、基础架构、通用规范、业务规范、代码规范、AI 协作规范、闭环机制和长期决策。

#### Scenario: 新增长期有效项目规则

- **WHEN** 某次变更产生长期有效的项目规则或决策
- **THEN** 该规则或决策必须写入 `docs/知识库/` 中对应中文文档

### Requirement: 渐进式知识加载

Agent SHALL（必须）按任务需要渐进式加载知识库，不应默认一次性加载全部文档。知识库索引必须说明不同任务类型对应的推荐加载文档。

#### Scenario: 处理架构设计任务

- **WHEN** Agent 处理架构设计相关任务
- **THEN** Agent 应加载项目背景、基础架构、业务规范和相关 OpenSpec 变更，而不是加载所有无关文档

### Requirement: 需求闭环回写

每次需求结束前 SHALL（必须）执行知识库回写检查，判断项目背景、架构、业务规则、代码规范、AI 协作流程和长期决策是否需要更新。

#### Scenario: 需求完成并准备交付

- **WHEN** Agent 完成一次需求分析、设计或实现任务
- **THEN** Agent 必须检查是否有稳定知识需要写回，并在最终说明中报告知识库更新或无需更新的判断

### Requirement: Superpowers 运行时优先

项目 SHALL（必须）采用 Superpowers 运行时优先策略：当 Agent 环境可见 Superpowers 技能时，必须优先调用真实技能；只有技能不可用或调用失败时，才允许退回 schema-only fallback。

#### Scenario: 实现任务需要执行计划

- **WHEN** Agent 准备按照 `plan.md` 实现功能，且当前环境可见 `executing-plans` 技能
- **THEN** Agent 必须优先调用 `executing-plans`，并在最终说明中标记本次为 `runtime-backed`

#### Scenario: 当前会话不可见 Superpowers 技能

- **WHEN** Agent 准备实现功能但当前会话不可见所需 Superpowers 技能
- **THEN** Agent 必须按同等文档纪律手工执行，并在最终说明中标记本次为 `schema-only fallback`

### Requirement: 项目级 Superpowers 技能

项目 SHALL（必须）优先通过项目级目录提供 Superpowers 技能文件，避免依赖单个开发者电脑的全局安装。可加载技能实体应位于 `.codex/skills/`。

#### Scenario: 新同事克隆项目

- **WHEN** 新同事克隆项目并打开 Codex
- **THEN** 项目中必须已经包含 Superpowers 技能文件，供 Codex 在新会话中加载项目级技能
