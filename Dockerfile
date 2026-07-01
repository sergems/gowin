# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:24-slim AS builder

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

WORKDIR /app

# Copy manifests first for layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc pnpm.config.cjs ./
COPY artifacts/api-server/package.json      ./artifacts/api-server/
COPY artifacts/gowin/package.json           ./artifacts/gowin/
COPY artifacts/mockup-sandbox/package.json  ./artifacts/mockup-sandbox/
COPY lib/db/package.json                    ./lib/db/
COPY lib/api-spec/package.json              ./lib/api-spec/
COPY lib/api-client-react/package.json      ./lib/api-client-react/
COPY lib/api-zod/package.json               ./lib/api-zod/
COPY scripts/package.json                   ./scripts/

RUN pnpm install --no-frozen-lockfile --ignore-scripts && \
    pnpm rebuild esbuild

COPY . .

# Build the frontend SPA and the API server bundle
RUN pnpm --filter @workspace/gowin run build
RUN pnpm --filter @workspace/api-server run build

# ── Stage 2: production runtime ──────────────────────────────────────────────
FROM node:24-slim AS runner

# Install postgresql-client so the entrypoint can run psql + pg_isready
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

# node_modules must come from the builder (pnpm workspace symlinks, nodemailer, pino workers)
COPY --from=builder /app/node_modules          ./node_modules
COPY --from=builder /app/package.json          ./
COPY --from=builder /app/pnpm-workspace.yaml   ./

# Workspace lib packages — these export TypeScript src directly (no build step)
# esbuild bundles them into the api-server, but package.json + src are needed
# to satisfy pnpm workspace symlinks at runtime
COPY --from=builder /app/lib/db/package.json               ./lib/db/
COPY --from=builder /app/lib/db/src                        ./lib/db/src
COPY --from=builder /app/lib/api-zod/package.json          ./lib/api-zod/
COPY --from=builder /app/lib/api-zod/src                   ./lib/api-zod/src
COPY --from=builder /app/lib/api-client-react/package.json ./lib/api-client-react/
COPY --from=builder /app/lib/api-client-react/src          ./lib/api-client-react/src
COPY --from=builder /app/lib/api-spec                      ./lib/api-spec

# API server bundle + package.json
COPY --from=builder /app/artifacts/api-server/dist        ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/

# api-server's own node_modules (pnpm symlinks into the shared .pnpm store).
# Required because some deps are esbuild-externalized (not bundled into dist/index.mjs)
# and must be resolvable via real node_modules at runtime — e.g. pdfmake, nodemailer.
# Node resolves modules by walking up from dist/index.mjs, so without this
# directory those externalized packages throw "Cannot find module" in production.
COPY --from=builder /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules

# Frontend static files (served by Express in production)
COPY --from=builder /app/artifacts/gowin/dist/public ./artifacts/gowin/dist/public

# Schema migration script + entrypoint
COPY scripts/schema.sql          ./scripts/schema.sql
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x /app/scripts/docker-entrypoint.sh

# Slide images are uploaded at runtime and must be persisted via a Docker volume.
# Mount a named volume at /app/uploads/slides in docker-compose.yml.
VOLUME ["/app/uploads/slides"]

EXPOSE 8080

# Entrypoint: waits for Postgres, applies schema (idempotent), then starts the server
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
