# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder

WORKDIR /workspace
ARG NPM_REGISTRY=https://registry.npmjs.org
ARG COREPACK_REGISTRY=https://registry.npmmirror.com
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_NPM_REGISTRY=${COREPACK_REGISTRY}
ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY}

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
COPY scripts scripts
COPY apps/api apps/api

RUN --mount=type=cache,id=openfit-pnpm-store,target=/root/.local/share/pnpm/store \
  pnpm --filter @openfit/api dev:db:generate \
  && pnpm --filter @openfit/shared build \
  && pnpm --filter @openfit/api build \
  && pnpm --offline --filter @openfit/api deploy --prod /prod/api \
  && mkdir -p /prod/api/prisma \
  && cp apps/api/prisma/schema.prisma /prod/api/prisma/schema.prisma \
  && cd /prod/api \
  && node node_modules/prisma/build/index.js generate --schema prisma/schema.prisma

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /prod/api ./
COPY --from=builder /workspace/apps/api/dist ./dist
COPY --from=builder /workspace/apps/api/prisma ./prisma

CMD ["sh", "-c", "node prisma/bootstrap.mjs && node dist/apps/api/src/main.js"]
