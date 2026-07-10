---
name: openspec-propose
description: 一步创建新的 OpenSpec 变更，并生成提案、需求规格、设计、准备度评审、任务和执行计划。适用于用户已经描述想构建或修复的内容，希望进入可实施状态。
license: MIT
compatibility: 需要 openspec CLI。
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.0"
---

创建新的 OpenSpec 变更，并按当前 schema 的依赖顺序生成全部实现前产物。

本项目默认使用 `spec-driven-superpowers`，通常会生成：
- `proposal.md`：做什么、为什么做、成功标准和影响范围。
- `specs/**/spec.md`：能力级需求规格。
- `design.md`：技术方案和关键决策。
- `review.md`：实现前准备度门禁。
- `tasks.md`：粗粒度任务清单。
- `plan.md`：实现阶段执行计划。

准备开始实现时，运行 `/opsx:apply` 或直接要求实现。

## 输入

用户请求应包含变更名称（kebab-case），或清楚描述想构建/修复的内容。

## 步骤

1. 如果没有清晰输入，先询问用户想做什么。
   - 问题示例：“你想推进哪个变更？请描述想构建或修复的内容。”
   - 根据描述派生 kebab-case 名称，例如“添加用户认证”派生为 `add-user-auth`。
   - 未理解用户目标前不得继续。

2. 创建变更目录。
   ```bash
   openspec new change "<name>"
   ```
   这会在 `openspec/changes/<name>/` 下创建脚手架和 `.openspec.yaml`。

3. 获取产物构建顺序。
   ```bash
   openspec status --change "<name>" --json
   ```
   解析：
   - `applyRequires`：实现前必须完成的产物 ID。
   - `artifacts`：所有产物状态及依赖。

4. 按依赖顺序创建产物，直到满足实现前要求。
   - 对每个依赖已满足且状态为 ready 的产物，读取指令：
     ```bash
     openspec instructions <artifact-id> --change "<name>" --json
     ```
   - 指令 JSON 中的 `context` 和 `rules` 是写作约束，不得原样复制到产物中。
   - 使用 `template` 作为结构，结合依赖产物内容生成中文产物。
   - 生成每个产物后重新运行 status，直到 `applyRequires` 全部完成。

5. 如果上下文关键缺失，先向用户澄清；若可以合理假设，则优先推进并在产物中标注假设。

6. 最后展示状态。
   ```bash
   openspec status --change "<name>"
   ```

## 产物创建准则

- 遵循 `openspec instructions` 返回的 `instruction`。
- 创建新产物前必须阅读其依赖产物。
- 使用模板结构，但不要复制 `<context>`、`<rules>` 或项目上下文块。
- 所有正文、注释和说明使用中文；保留必要英文关键词时，应放在中文语境中。

## 防护栏

- 创建 schema 定义的全部实现前必需产物。
- 如果同名变更已存在，询问用户是继续还是新建。
- 每次写完产物后确认文件存在。
- 不在 propose 阶段实现业务代码。
