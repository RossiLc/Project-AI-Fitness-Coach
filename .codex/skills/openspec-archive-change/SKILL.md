---
name: openspec-archive-change
description: 归档已完成的 OpenSpec 变更。适用于用户希望在实现完成后收尾、同步规格并移动到 archive。
license: MIT
compatibility: 需要 openspec CLI。
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.0"
---

归档已完成的 OpenSpec 变更。

## 输入

用户可以指定变更名称；如果省略且存在多个活动变更，必须让用户选择，不要猜。

## 步骤

1. 选择变更。
   ```bash
   openspec list --json
   ```
   只展示未归档的活动变更，并包含 schema 信息。

2. 检查产物完成状态。
   ```bash
   openspec status --change "<name>" --json
   ```
   如果有产物未完成，列出并要求用户确认是否仍要归档。

3. 检查任务完成状态。
   - 读取 `tasks.md`。
   - 统计 `- [ ]` 与 `- [x]`。
   - 如果仍有未完成任务，提示风险并要求确认。

4. 检查 delta specs 是否需要同步。
   - 查看 `openspec/changes/<name>/specs/`。
   - 与 `openspec/specs/<capability>/spec.md` 对比。
   - 汇总将要新增、修改、移除或重命名的需求。
   - 用户确认后再同步或跳过。

5. 执行归档。
   - 创建 `openspec/changes/archive`。
   - 目标目录为 `YYYY-MM-DD-<change-name>`。
   - 如果目标已存在，停止并提示冲突。
   - 将变更目录移动到归档目录。

6. 展示归档摘要。
   - 变更名称。
   - schema。
   - 归档路径。
   - specs 是否已同步。
   - 是否存在未完成产物或任务。

## 防护栏

- 未提供变更名且存在多个活动变更时，必须让用户选择。
- 不因警告自动阻止归档，但必须让用户知情确认。
- 移动目录时保留 `.openspec.yaml`。
- 所有输出和更新文档使用中文。
