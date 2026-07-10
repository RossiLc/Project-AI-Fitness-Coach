## Scope

本计划覆盖 Open Fit 项目的流程基础设施、需求分析、知识库体系和 Superpowers 项目级运行时集成。

## Covers

- 1.1 至 1.10
- 2.1 至 2.4
- 3.1 至 3.4
- 4.1 至 4.5
- 5.1 至 5.7
- VF-企业微信
- VF-打卡
- VF-统计
- VF-提醒
- VF-健康安全
- VF-中文化
- VF-知识库闭环
- VF-Superpowers 运行时优先

## Plan Type

lightweight

## Execution Strategy

standard

## Ordered Steps

1. 初始化 OpenSpec 与 `spec-driven-superpowers`。
2. 建立中文入口文件：`AGENTS.md`、`CLAUDE.md`、`README.md`。
3. 建立中文知识库：`docs/知识库/`。
4. 将 Superpowers 技能放入项目级 `.codex/skills/`。
5. 将需求分析拆成企业微信机器人、Web 打卡、统计提醒、健康安全和知识库体系五个能力。
6. 形成设计、评审、任务和计划。
7. 运行 OpenSpec 校验。

## Validation Per Step

1. `openspec schema validate spec-driven-superpowers`
2. `openspec validate analyze-open-fit-requirements`
3. 确认 `docs/知识库/` 使用中文命名。
4. 确认 `.codex/skills/` 已包含 OpenSpec 和 Superpowers 技能。
5. 确认没有额外技能检查脚本依赖。

## Files / Owners

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/知识库/*.md`
- `.codex/skills/`
- `openspec/config.yaml`
- `openspec/schemas/spec-driven-superpowers/`
- `openspec/changes/analyze-open-fit-requirements/`

## Completion Checkpoint

- OpenSpec schema 有效。
- 当前需求分析 change 有效。
- 中文知识库和入口文件完成。
- Superpowers 技能在项目级 `.codex/skills/` 中提供。
- 不再保留第三方源码快照目录。
- 不再保留额外技能检查脚本。

## Knowledge Base Writeback

本次变更已回写：

- `docs/知识库/项目背景.md`
- `docs/知识库/基础架构.md`
- `docs/知识库/通用规范.md`
- `docs/知识库/业务规范.md`
- `docs/知识库/代码规范.md`
- `docs/知识库/AI协作规范.md`
- `docs/知识库/Superpowers运行时集成.md`
- `docs/知识库/闭环机制.md`
- `docs/知识库/决策记录.md`

## Completion Verification

- `openspec schema validate spec-driven-superpowers`
- `openspec validate analyze-open-fit-requirements`

## Delivery Handoff

后续添加新功能时，先创建 OpenSpec change；如果新会话能识别 Superpowers 技能，则按 `runtime-backed` 执行；如果技能不可见或调用失败，则按 `schema-only fallback` 执行，并在最终回复中说明。
