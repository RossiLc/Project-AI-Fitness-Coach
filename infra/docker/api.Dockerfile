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
COPY scripts scripts
COPY apps/api apps/api

RUN pnpm --filter @openfit/api dev:db:generate \
  && pnpm --filter @openfit/shared build \
  && pnpm --filter @openfit/api build \
  && pnpm --filter @openfit/api deploy --prod /prod/api

RUN generated_client="$(find /workspace/node_modules/.pnpm -path '*/node_modules/.prisma/client' -type d | head -n 1)" \
  && target_prisma_dir="$(find /prod/api/node_modules/.pnpm -path '*/node_modules/.prisma' -type d | head -n 1)" \
  && test -n "$generated_client" \
  && test -n "$target_prisma_dir" \
  && rm -rf "$target_prisma_dir/client" \
  && cp -R "$generated_client" "$target_prisma_dir/client"

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /prod/api ./
COPY --from=builder /workspace/apps/api/dist ./dist

CMD ["node", "dist/apps/api/src/main.js"]
