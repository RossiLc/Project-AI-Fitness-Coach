# AI 协作规范

## 入口

- Agent 必须先读 `AGENTS.md`。
- Claude 类工具通过 `CLAUDE.md` 跳转到 `AGENTS.md`。
- 不一次性加载全部知识库；按任务类型渐进式加载。

## OpenSpec

- 新需求优先创建或更新 OpenSpec change。
- 高风险、跨模块或影响长期规则的工作使用 `spec-driven-superpowers`。
- 从 0 到 1 产品、跨端平台、企业集成、架构选型或多模块系统必须按“方案级变更”处理。
- 方案级变更的 `proposal.md` 必须标记 `Change Level: solution-architecture`，并说明技术选型、前端、后端、集成、数据模型、流程架构、部署运维、安全和验证矩阵的覆盖要求。
- 方案级变更的 `design.md` 必须覆盖技术选型、系统架构、Web 工作台、后端服务、企业微信接入、AI 服务、数据表设计、端到端流程、安全隐私、部署运维和验证矩阵。
- 方案级变更的 `review.md` 必须包含 Solution Coverage Gate；关键方案部分缺失时不得标记为 ready。
- 实现前必须经过 `review.md` 和 `plan.md`。
- 完成后更新 `tasks.md` 并运行必要验证。
- 归档前检查是否需要回写 `docs/知识库/`。

## Superpowers

- 当前项目采用 Superpowers 运行时优先。
- 如果 `.codex/skills/` 中技能可见，必须优先调用真实技能。
- 技能不可见或调用失败时，才按同等文档纪律手工执行，称为 `schema-only fallback`。
- 最终回复必须说明本次是 `runtime-backed` 还是 `schema-only fallback`。
- Superpowers 上游运行时资产保持完整，不为了中文化而裁剪脚本、示例、参考文件或 prompt。

## 协作闭环

每次需求结束前至少回答：

- 本次变更验证了吗？
- `tasks.md` 是否反映真实进度？
- 是否产生长期有效规则、架构决策或踩坑记录？
- 如果产生，是否已经写回 `docs/知识库/`？
