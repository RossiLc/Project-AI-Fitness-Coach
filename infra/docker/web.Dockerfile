# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder

WORKDIR /workspace
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
ENV VITE_API_BASE_URL=

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN --mount=type=cache,id=openfit-pnpm-store,target=/root/.local/share/pnpm/store \
  corepack enable \
  && corepack prepare pnpm@9.15.4 --activate \
  && pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/web apps/web

RUN --mount=type=cache,id=openfit-pnpm-store,target=/root/.local/share/pnpm/store \
  pnpm --filter @openfit/shared build \
  && pnpm --filter @openfit/web build

FROM nginx:1.27-alpine AS runtime

COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html
