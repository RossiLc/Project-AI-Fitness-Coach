## 1. 工作流基础设施

- [x] 1.1 初始化 OpenSpec 项目结构，并为 Codex 生成项目级 OpenSpec 技能。
- [x] 1.2 引入项目本地 `spec-driven-superpowers` schema。
- [x] 1.3 将 OpenSpec 配置、schema、模板和项目自写说明统一中文化。
- [x] 1.4 验证 OpenSpec 能识别并校验 `spec-driven-superpowers` schema。
- [x] 1.5 新增 `AGENTS.md` 和 `CLAUDE.md` 作为 Agent 入口文件。
- [x] 1.6 新增 `docs/知识库/` 长期知识库目录和索引。
- [x] 1.7 将渐进式加载和知识库回写闭环写入项目流程约束。
- [x] 1.8 将项目从 schema-only 默认说明升级为 Superpowers 运行时优先策略。
- [x] 1.9 删除额外的 Superpowers 存在性检查脚本，改为随 Git 提交 `.codex/skills/`。
- [x] 1.10 将 Superpowers 从用户级依赖改为项目级 `.codex/skills/` 运行时资产。
- [x] 1.11 恢复完整 Superpowers 上游技能运行时，保留脚本、参考文件、prompt 和示例。
- [x] 1.12 增加 Superpowers 全局路径引用审计，防止项目级技能重新依赖用户目录。

## 2. 需求分析

- [x] 2.1 梳理企业微信 AI 健身教练机器人能力范围。
- [x] 2.2 梳理 Web 运动打卡平台能力范围。
- [x] 2.3 梳理排行榜、仪表盘和未打卡提醒能力范围。
- [x] 2.4 梳理健康、饮食、运动咨询的安全边界。

## 3. 技术调研

- [x] 3.1 调研企业微信群机器人适合承担的群内通知能力。
- [x] 3.2 调研企业微信自建应用消息更适合承担的个人定向提醒能力。
- [x] 3.3 识别图片/文本 AI 识别、卡路里估算和用户确认流程的关键风险。
- [x] 3.4 识别健康咨询、隐私数据和排行榜展示的合规与体验风险。

## 4. 待确认事项

- [ ] 4.1 确认企业微信管理员权限、群机器人 webhook 和自建应用消息能力是否可用。
- [ ] 4.2 确认员工身份来源、企业微信 userid 映射和登录方式。
- [ ] 4.3 确认活动周期、补卡规则、撤回规则和管理员修正规则。
- [ ] 4.4 确认排行榜主指标、平局规则和对外展示字段。
- [ ] 4.5 确认图片数据保存期限、访问权限、删除策略和脱敏要求。

## 5. 验证

- [x] 5.1 运行 `openspec schema validate spec-driven-superpowers` 验证 schema 有效。
- [x] 5.2 运行 `openspec validate analyze-open-fit-requirements` 验证变更产物。
- [x] 5.3 运行 `openspec status --change analyze-open-fit-requirements` 确认变更状态。
- [x] 5.4 检查知识库入口与回写规则是否可以从 `README.md`、`AGENTS.md` 和 `docs/知识库/索引.md` 找到。
- [x] 5.5 检查 `.codex/skills/` 已包含 OpenSpec 技能和完整 Superpowers 技能运行时。
- [x] 5.6 运行 `node scripts/audit-superpowers-global-refs.mjs` 验证 `.codex/skills/` 不含全局路径依赖。
