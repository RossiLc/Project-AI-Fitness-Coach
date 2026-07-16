# Open Fit 第一阶段本地启动

第一阶段目标是启动 PostgreSQL、Redis、API、worker 和 Web 工作台，并支持企业微信智能机器人长连接接收消息与主动群推送。

## 环境文件

在项目根目录复制环境变量：

```powershell
Copy-Item .env.example .env
```

企业微信默认使用智能机器人长连接。若要联调两个机器人：

```env
WECOM_CHECKIN_BOT_ID=你的打卡助手BotID
WECOM_CHECKIN_BOT_SECRET=你的打卡助手Secret
WECOM_COACH_BOT_ID=你的AI教练BotID
WECOM_COACH_BOT_SECRET=你的AI教练Secret
```

后台“提醒未打卡”通过打卡助手智能机器人的长连接 `sendMessage` 主动推送到群。首次使用前，需要先在目标群里 @Open Fit 打卡助手发送任意消息，系统会保存该群 `chatid` 作为后续推送目标。

AI 教练和企业微信打卡识别不提供 mock AI 结果。联调 GPT-5.5 时替换：

```env
AI_BASE_URL=https://你的模型服务地址/v1
AI_API_KEY=你的key
AI_MODEL=gpt-5.5
```

企业微信智能机器人入站默认使用 SDK 长连接。联调时替换两个机器人的 Bot ID 和 Secret：

```env
WECOM_CHECKIN_BOT_ID=企业微信后台的打卡助手BotID
WECOM_CHECKIN_BOT_SECRET=企业微信后台的打卡助手Secret
WECOM_COACH_BOT_ID=企业微信后台的AI教练BotID
WECOM_COACH_BOT_SECRET=企业微信后台的AI教练Secret
WECOM_INTELLIGENT_BOT_WS_URL=
```

不要提交 `.env`。

## 启动 Docker 全部服务

```powershell
pnpm docker:up
```

`docker:up` 会先构建 API、worker 和 Web 镜像。依赖安装、Prisma Client 生成和前后端编译都发生在 Docker build 阶段；容器启动后只运行编译产物。

- API 容器运行 `dist/apps/api/src/main.js`。
- Worker 容器运行 `dist/apps/worker/src/main.js`。
- Web 容器使用 nginx 提供 `apps/web/dist` 静态文件，并把 `/api` 反向代理到 API 容器。

首次 build 需要下载依赖，耗时较长；后续未改依赖时会复用 Docker build cache。

## 关闭 Docker 全部服务

```powershell
pnpm docker:down
```

## 初始化开发数据库

```powershell
pnpm install
pnpm dev:db:setup
```

`dev:db:setup` 只用于本地开发或演示环境：它会生成 Prisma Client、用 `prisma db push` 把当前 schema 同步到本地数据库，并写入示例企业、成员、活动和提醒任务。

生产环境不要使用 `prisma db push`。生产发布应使用数据库迁移流程，例如构建阶段生成 Prisma Client，部署阶段执行 `prisma migrate deploy` 或等价迁移任务；内置基础数据应通过幂等 bootstrap/seed 任务写入，并纳入发布流程。

## 启动应用

```powershell
pnpm dev
```

- Web: `http://localhost:15173`
- API health: `http://localhost:13100/api/health`

注意：Open Fit 的宿主机端口统一避开常用默认端口：PostgreSQL `15432`、Redis `16380`、API `13100`、Web `15173`；Docker Compose 内部服务之间仍使用容器内标准端口。
