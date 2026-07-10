# Superpowers 运行时集成

## 目录说明

- `.codex/skills/`：项目级 Codex 技能目录，包含 OpenSpec 技能和 Superpowers 技能。
- `.codex/skills/` 会提交到 Git，团队成员克隆项目后即可获得项目所需技能文件。
- 不需要额外的技能存在性检查脚本，因为技能文件本身已经随项目版本化。

## 核心策略

本项目采用“中文入口 + 原版运行时保真”的策略：

- 项目入口、知识库、README、OpenSpec 产物和项目自写说明统一使用中文。
- Superpowers 是第三方运行时资产，目录结构、`SKILL.md`、脚本、参考文档、prompt 和示例文件应尽量保持上游原貌。
- 不为了中文化而删除脚本、工具、示例或门禁材料。
- 如果需要中文解释，应在 `AGENTS.md`、`README.md` 或本知识库文件中补充，不直接弱化上游技能本体。

## 为什么不能只靠提示词

Superpowers 的价值不只是几段规则提示，而是把执行纪律拆成可复用技能：

- `using-superpowers`：要求 Agent 在行动前先检查并调用相关技能。
- `brainstorming`：在需求和设计不清晰时先扩散、比较、收敛。
- `writing-plans`：把规格转成可执行计划。
- `executing-plans`：按计划推进并在检查点验证。
- `test-driven-development`：约束先写失败测试，再实现，再重构。
- `systematic-debugging`：按复现、假设、排除、根因证明推进调试。
- `verification-before-completion`：完成前必须拿到验证证据。
- `requesting-code-review` / `receiving-code-review`：形成代码审查闭环。
- `finishing-a-development-branch`：在收尾阶段整理验证、提交和交付材料。

因此，`.codex/skills/` 中的工具、脚本、参考文件和示例文件是约束能力的一部分，不应轻易裁剪。

## OpenSpec 如何调用 Superpowers

`openspec/schemas/spec-driven-superpowers/schema.yaml` 是两者结合的关键：

- OpenSpec 定义变更产物和生命周期。
- schema 要求在 `review.md`、`tasks.md`、`plan.md`、`verification.md` 等产物中显式体现门禁、执行计划和验证证据。
- 当当前 Agent 环境可见 Superpowers 技能时，必须按真实技能执行。
- 只有技能不可见或调用失败时，才允许按同一文档结构进行 `schema-only fallback`。

## 关于上游示例文件

`.codex/skills/systematic-debugging/condition-based-waiting-example.ts` 是 Superpowers 上游的参考示例，不是 Open Fit 业务源码。该文件已经改成自包含类型声明，不再引用 `~/threads/...` 这类上游或用户级路径。

后续建立 TypeScript、lint、测试或打包工程时，必须把 `.codex/**` 排除在业务源码检查之外。示例策略：

```json
{
  "exclude": [".codex/**", "node_modules/**", "dist/**"]
}
```

## 全局路径依赖处理

项目级 Superpowers 的原则是：技能文件可以保留上游结构，但不能依赖某个开发者电脑上的用户目录。

- 禁止把 `~/.claude/skills`、`~/.config/superpowers`、`~/threads/...`、`C:\Users\...`、`/Users/...`、`/home/...` 作为运行依赖。
- 需要运行时临时文件时，使用仓库根目录下的 `.superpowers/`，并通过 `.gitignore` 排除。
- 同步或更新 `.codex/skills/` 后，运行下面的审计：

```bash
node scripts/audit-superpowers-global-refs.mjs
```

该脚本只检查全局路径引用，不检查技能目录是否存在；技能目录本身随 Git 提交。

## 使用规则

- 新增或更新 `.codex/skills/` 后，需要重启 Codex 或新开线程，让会话重新加载项目级技能。
- 如果当前会话能看到 Superpowers 技能，必须优先调用真实技能。
- 如果技能不可见或调用失败，才退回 `schema-only fallback`。
- 最终回复需要说明本次是 `runtime-backed` 还是 `schema-only fallback`。
