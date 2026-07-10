---
name: openspec-apply-change
description: 根据 OpenSpec 变更执行实现任务。适用于用户要求开始实现、继续实现或逐项完成 tasks.md / plan.md。
license: MIT
compatibility: 需要 openspec CLI。
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.0"
---

根据 OpenSpec 变更实现任务。

## 输入

用户可以指定变更名称；如果省略，则从对话上下文推断。若无法明确判断，必须列出现有变更并让用户选择。

## 步骤

1. 选择变更。
   - 如果用户提供名称，直接使用。
   - 如果只有一个活动变更，可以自动选择。
   - 如果存在歧义，运行：
     ```bash
     openspec list --json
     ```
     然后询问用户选择。
   - 明确告知：“使用变更：<name>”。

2. 检查状态和 schema。
   ```bash
   openspec status --change "<name>" --json
   ```
   理解当前 schema、任务产物和待完成状态。

3. 获取实现指令。
   ```bash
   openspec instructions apply --change "<name>" --json
   ```
   处理状态：
   - `blocked`：缺少必要产物，提示先补齐。
   - `all_done`：提示已完成，可归档。
   - 其他状态：继续实现。

4. 阅读上下文文件。
   - 对 `spec-driven-superpowers`，实现前读取 `proposal.md`、`specs`、`design.md`、`review.md`、`tasks.md`、`plan.md`。
   - 其他 schema 按 CLI 返回的 `contextFiles` 读取。

5. 展示当前进度。
   - schema 名称。
   - 已完成任务数 / 总任务数。
   - 剩余任务概览。
   - CLI 返回的动态指令重点。

6. 按 plan.md 和 tasks.md 实现。
   - 逐个处理待办任务。
   - 变更保持最小、聚焦。
   - 完成后立即在 `tasks.md` 中把 `- [ ]` 改为 `- [x]`。
   - 如果 plan.md 改变任务边界、顺序或完成定义，先同步更新 tasks.md。

7. 暂停条件。
   - 任务不清楚。
   - 实现暴露设计问题。
   - 发生错误或阻塞。
   - 用户中断。

8. 完成或暂停时展示状态。
   - 本次完成的任务。
   - 总体进度。
   - 全部完成时建议归档。
   - 暂停时说明原因和可选路径。

## 防护栏

- 开始前必须阅读上下文文件。
- `review.md` 标记 blocked 时不得实现。
- 任务含糊时先澄清。
- 实现应小步、可验证、按计划推进。
- 所有新增或更新文档使用中文。
