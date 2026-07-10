# spec-driven-superpowers

本目录保存项目本地的 `spec-driven-superpowers` OpenSpec 工作流 schema。

## 内容

- `schema.yaml`：工作流约束。
- `templates/*.md`：各类 OpenSpec 产物模板。

## 工作流强化点

- 使用 `review.md` 作为实现前准备度门禁。
- 使用 `plan.md` 作为实现阶段执行驱动。
- 对从 0 到 1 产品、跨端平台、企业集成、架构选型或多模块系统，按“方案级变更”处理。
- 方案级变更的 `design.md` 必须覆盖技术选型、前端工作台、后端服务、企业集成、AI 服务、数据模型、端到端流程、部署运维、安全隐私和验证矩阵。
- `review.md` 必须检查方案覆盖度；关键部分缺失时不得标记为 ready。
- 保留 `brainstorm.md` 与 `verification.md` 作为可选伴随文件。
- 当运行环境具备 Superpowers 技能时，必须优先调用真实技能。
- 当技能不可用或调用失败时，按同一文档结构手工执行，不阻塞流程，并在结果中说明 `schema-only fallback`。

## 语言要求

项目自写文档、模板说明和后续 OpenSpec 产物统一使用中文。英文专有名词可以保留，但必须服务于中文说明。

Superpowers 上游运行时资产不属于本目录的中文化范围；它们保存在 `.codex/skills/`，应保持运行能力优先。
