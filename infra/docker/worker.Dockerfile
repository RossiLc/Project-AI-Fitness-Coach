FROM node:22-alpine AS builder

WORKDIR /workspace
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN corepack enable \
  && corepack prepare pnpm@9.15.4 --activate \
  && pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/worker apps/worker

RUN pnpm --filter @openfit/shared build \
  && pnpm --filter @openfit/worker build \
  && pnpm --filter @openfit/worker deploy --prod /prod/worker

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /prod/worker ./
COPY --from=builder /workspace/apps/worker/dist ./dist

CMD ["node", "dist/apps/worker/src/main.js"]
