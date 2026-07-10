# Open Fit Claude 入口

本文件供 Claude 类 Agent 使用。通用入口和规则以 `AGENTS.md` 为准。

## 默认规则

- 先阅读 `AGENTS.md`。
- 所有项目自写输出和新增文档使用中文。
- 需求、设计、实现、验证和复盘必须形成闭环。
- 每次需求结束后执行知识库回写检查。
- 如果当前会话能看到 Superpowers 技能，必须优先调用真实技能；只有不可用或失败时，才退回 `schema-only fallback`。

## 上下文加载

- 总览任务读取 `docs/知识库/索引.md` 和 `docs/知识库/项目背景.md`。
- 架构任务追加读取 `docs/知识库/基础架构.md`。
- 业务任务追加读取 `docs/知识库/业务规范.md`。
- 代码实现追加读取 `docs/知识库/代码规范.md` 和对应 OpenSpec change。
- Agent 流程或 Superpowers 问题追加读取 `docs/知识库/AI协作规范.md` 和 `docs/知识库/Superpowers运行时集成.md`。

## Superpowers 说明

`.codex/skills/` 是项目级运行时资产目录。来自 Superpowers 上游的技能文件、脚本、示例和 prompt 应保持完整，不要为了中文化而裁剪或破坏运行能力。项目自写文档负责用中文解释这些资产如何使用。
