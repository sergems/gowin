# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests first for layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/gowin/package.json       ./artifacts/gowin/
COPY lib/db/package.json                ./lib/db/
COPY lib/api-spec/package.json          ./lib/api-spec/
COPY lib/api-client-react/package.json  ./lib/api-client-react/
COPY lib/api-zod/package.json           ./lib/api-zod/

RUN pnpm install --frozen-lockfile

COPY . .

# Build workspace libs (db schema types, generated API hooks)
RUN pnpm --filter @workspace/db run build             2>/dev/null || true
RUN pnpm --filter @workspace/api-zod run build        2>/dev/null || true
RUN pnpm --filter @workspace/api-client-react run build 2>/dev/null || true

# Build the frontend SPA and the API server bundle
RUN pnpm --filter @workspace/gowin run build
RUN pnpm --filter @workspace/api-server run build

# ── Stage 2: production runtime ──────────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

# node_modules must come from the builder (pnpm workspace symlinks, nodemailer, pino workers)
COPY --from=builder /app/node_modules          ./node_modules
COPY --from=builder /app/package.json          ./
COPY --from=builder /app/pnpm-workspace.yaml   ./

# Workspace lib packages referenced by pnpm symlinks at runtime
COPY --from=builder /app/lib/db/package.json               ./lib/db/
COPY --from=builder /app/lib/db/dist                       ./lib/db/dist
COPY --from=builder /app/lib/api-zod/package.json          ./lib/api-zod/
COPY --from=builder /app/lib/api-zod/dist                  ./lib/api-zod/dist
COPY --from=builder /app/lib/api-client-react/package.json ./lib/api-client-react/
COPY --from=builder /app/lib/api-client-react/dist         ./lib/api-client-react/dist
COPY --from=builder /app/lib/api-spec                      ./lib/api-spec

# API server bundle + package.json
COPY --from=builder /app/artifacts/api-server/dist        ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/

# Frontend static files (served by Express in production)
COPY --from=builder /app/artifacts/gowin/dist/public ./artifacts/gowin/dist/public

EXPOSE 8080

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
