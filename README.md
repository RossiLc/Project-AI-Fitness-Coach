# Open Fit：AI 健身教练

Open Fit 是面向企业内部员工的 AI 健身教练与运动打卡平台。项目使用 OpenSpec + spec-driven-superpowers 管理需求、设计、实现、验证和知识库回写。

## 给新同事的快速理解

AI 编码不是让 AI 直接乱写代码，而是让 AI 按工程流程工作：

1. 先澄清需求：为什么做、做什么、不做什么。
2. 再写规格：用户触发什么，系统必须如何响应。
3. 再写设计：模块、数据流、风险和边界。
4. 再拆任务和计划：谁先谁后、怎么验证。
5. 最后实现、测试、验证。
6. 需求结束后，把长期有效结论写回知识库。

## OpenSpec + Superpowers 如何结合

- OpenSpec 负责“控制面”：变更目录、产物顺序、规格校验和归档。
- Superpowers 负责“执行纪律”：头脑风暴、写计划、执行计划、TDD、完成前验证、系统化调试、代码审查、并行开发和分支收尾。
- spec-driven-superpowers 把 Superpowers 的纪律写进 OpenSpec schema：`review.md` 是实现前门禁，`plan.md` 是执行驱动，`verification.md` 保存验证证据。

本项目采用“Superpowers 运行时优先”：

- 如果 Codex 当前会话能看到 `.codex/skills/` 中的 Superpowers 技能，必须优先调用真实技能，称为 `runtime-backed`。
- 如果技能不可见或调用失败，才退回 `schema-only fallback`。
- Codex 通常在会话启动时加载技能，所以新增或更新 `.codex/skills/` 后，请重启 Codex 或新开线程。

## 关于 Superpowers 目录

- `.codex/skills/`：项目级 Codex 技能目录，包含 OpenSpec 技能和 Superpowers 技能。
- Superpowers 技能是第三方运行时资产。为保持约束能力，目录、脚本、参考文件、prompt 和示例文件应尽量保持上游原貌。
- 项目知识库、README、OpenSpec 产物和项目自写说明必须使用中文。
- 上游 Superpowers 的 `SKILL.md`、脚本或示例中可能包含英文，这是运行时保真要求，不视为项目中文化失败。
- `.codex/skills/systematic-debugging/condition-based-waiting-example.ts` 是上游参考示例，不是 Open Fit 业务源码；后续建立 TypeScript 工程时，应在项目 `tsconfig` / lint 配置中排除 `.codex/**`。
- `.codex/skills/` 不应依赖用户级目录或全局脚本；更新技能后可运行 `node scripts/audit-superpowers-global-refs.mjs` 做门禁审计。
- 之前的第三方源码快照目录是 Superpowers 上游源码副本，用来同步技能；当前项目只保留 Codex 实际加载的 `.codex/skills/`。

`.codex/skills/` 会提交到 Git，因此不需要额外的技能存在性检查脚本。新增或更新技能后，重启 Codex 或新开线程即可。

## Mac 环境搭建

```bash
xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git nvm
mkdir -p ~/.nvm
```

把下面内容加入 `~/.zshrc`：

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
```

重新打开终端：

```bash
nvm install --lts
nvm use --lts
corepack enable
corepack prepare yarn@stable --activate
npm install -g @fission-ai/openspec@latest
npm install -g @openai/codex
```

验证：

```bash
git --version
node --version
yarn --version
openspec --version
codex --version
```

## 项目需求简述

### 企业微信 AI 健身教练

- 群成员 @ 机器人后，机器人回答运动、饮食、健康类问题。
- 每天 9 点自动推送健康小贴士。
- 每周推送活动排行榜卡片。
- 健康建议必须明确非医疗诊断边界。

### Web 运动打卡平台

- 员工上传运动图片或输入文字运动内容。
- AI 识别运动项目、时长、强度和估算热量。
- 员工确认或修正识别结果后形成正式打卡记录。
- 仪表盘展示柱状图、排行榜和对比数据。
- 每天晚上 8 点提醒未打卡成员。

## 如何添加一个新功能

以“补卡功能”为例：

1. 让 AI 先读入口和知识库：

   ```text
   请先阅读 AGENTS.md 和 docs/知识库/索引.md，然后分析如何添加补卡功能。
   ```

2. 创建 OpenSpec 变更：

   ```bash
   openspec new change add-makeup-checkin
   ```

3. 让 AI 生成中文产物：

   ```text
   请用 OpenSpec + spec-driven-superpowers 为“添加补卡功能”创建 proposal、specs、design、review、tasks 和 plan。
   ```

4. 校验：

   ```bash
   openspec validate add-makeup-checkin
   openspec status --change add-makeup-checkin
   ```

5. 实现：

   ```text
   请按照 add-makeup-checkin 的 plan.md 开始实现；有 Superpowers 技能时优先调用真实技能。
   ```

6. 验证和回写：

   - 运行测试、lint、build。
   - 更新 `tasks.md`。
   - 判断是否要更新 `docs/知识库/`。
   - 最终说明本次是 `runtime-backed` 还是 `schema-only fallback`。

7. 完成后归档：

   ```bash
   openspec archive add-makeup-checkin
   ```

## 目录说明

```text
AGENTS.md                         Agent 主入口
CLAUDE.md                         Claude 类工具入口
README.md                         项目说明
docs/知识库/                      长期知识库
openspec/config.yaml              OpenSpec 项目配置
openspec/schemas/                 项目本地 OpenSpec schema
openspec/changes/                 单次需求变更
.codex/skills/                    项目级 Codex 技能目录
```
