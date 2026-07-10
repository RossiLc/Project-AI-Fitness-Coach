# Open Fit Agent 入口

本文件是 Codex、Claude 类 Agent 和其他 AI 协作工具进入本项目时必须优先阅读的入口文件。所有项目协作默认使用中文。

## 必读原则

- 先读本文件，再按任务需要渐进式加载知识库和 OpenSpec 产物。
- 不一次性加载所有文档；只加载与当前任务相关的最小上下文。
- 需求、设计、实现、验证和复盘都必须形成闭环。
- 每次变更结束后，必须判断是否需要更新项目知识库。
- 不把临时讨论结果散落在聊天里；稳定结论应沉淀到 `docs/知识库/` 或 OpenSpec 产物。
- 如果当前会话能看到 Superpowers 技能，必须优先调用真实技能；只有不可用或失败时，才退回 `schema-only fallback`。

## 项目一句话

Open Fit 是面向企业内部员工的 AI 健身教练与运动打卡平台，由企业微信机器人和 Web 运动打卡平台共同组成。

## 默认工作流

1. 阅读本文件。
2. 根据任务类型加载 `docs/知识库/索引.md` 中列出的相关知识。
3. 查看当前 OpenSpec 状态：

   ```bash
   openspec list --json
   ```

4. 对需求或设计类工作，优先创建或更新 OpenSpec 变更。
5. 对实现类工作，必须读取对应变更的 `proposal.md`、`specs/`、`design.md`、`review.md`、`tasks.md` 和 `plan.md`。
6. 根据 `review.md` 和 `plan.md` 判断并调用相关 Superpowers 技能。
7. 完成后运行必要验证，并更新任务状态。
8. 执行知识库回写检查，必要时更新 `docs/知识库/`。
9. 最终回复说明本次是 `runtime-backed` 还是 `schema-only fallback`。

## 渐进式加载规则

- 总览任务：读取 `docs/知识库/索引.md`、`docs/知识库/项目背景.md`。
- 架构任务：追加读取 `docs/知识库/基础架构.md`。
- 业务需求：追加读取 `docs/知识库/业务规范.md`。
- 代码实现：追加读取 `docs/知识库/代码规范.md` 和相关 OpenSpec 变更。
- AI/Agent 流程：追加读取 `docs/知识库/AI协作规范.md`。
- Superpowers 集成：追加读取 `docs/知识库/Superpowers运行时集成.md`。
- 变更收尾：追加读取 `docs/知识库/闭环机制.md`。

## Superpowers 规则

- `.codex/skills/` 是项目级技能目录，需要随项目提交。
- Superpowers 技能是第三方运行时资产。为保持门禁和脚本能力，不应随意删除、裁剪或翻译上游运行文件。
- 项目自写说明必须用中文解释这些技能如何在本项目中使用。
- 上游技能中的英文说明、脚本、示例和 prompt 允许保留；这属于运行时保真，不视为项目文档中文化失败。
- `.codex/skills/**` 不属于 Open Fit 业务源码；后续建立代码工程时，应在 TypeScript、lint、测试和打包配置中排除该目录。
- `.codex/skills/**` 不得依赖用户级目录或全局脚本，例如 `~/.claude/skills`、`~/.config/superpowers`、`~/threads/...`、`C:\Users\...`、`/Users/...`、`/home/...`。
- 更新 Superpowers 技能后，运行 `node scripts/audit-superpowers-global-refs.mjs` 审计是否引入全局路径引用。

## 知识库回写触发条件

出现以下情况时，必须更新知识库：

- 项目背景、目标用户、核心场景或范围发生变化。
- 架构、技术栈、模块边界、数据流或集成方式发生变化。
- 业务规则、排行榜规则、提醒规则、健康安全边界发生变化。
- 代码规范、目录结构、测试策略、提交规范发生变化。
- OpenSpec 工作流、Agent 协作方式、文档加载规则发生变化。
- 复盘中发现可复用经验、踩坑记录或决策依据。

## 文档语言

所有项目自写文档、OpenSpec 产物、模板注释和新增说明统一使用中文。英文专有名词可保留，但必须放在中文语境中说明。

第三方运行时资产例外：`.codex/skills/` 中来自 Superpowers 上游的文件可以保留英文和原始结构，以保证技能触发、脚本执行、参考材料和门禁约束不被破坏。
