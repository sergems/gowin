# GoWin Sportsbook

A sports betting platform with live fixtures, bet placement, wallet management, and full user/admin management.

## Replit Dev Setup

To get this project running on Replit from a fresh import:

1. **Install dependencies** — `pnpm install` (run once; pnpm workspaces handle all packages)
2. **Database** — Replit provides PostgreSQL automatically; `DATABASE_URL` is injected at runtime. Push the schema first (`pnpm --filter @workspace/db run push`), then seed from the dump: `psql $DATABASE_URL -f bkt.sql`.
   - **FK-ordering caveat**: `bkt.sql`'s `COPY` statements populate `fixtures`/`leagues`/`markets`/etc. *before* the tables they reference (`sports`/`teams` are copied near the end of the file); the dump relies on adding all FK constraints via `ALTER TABLE ... ADD CONSTRAINT` at the very end. Since `drizzle-kit push` already creates those FKs beforehand, a direct `psql -f bkt.sql` will fail most inserts with FK violations. Work around it once per fresh import:
     ```sql
     -- drop existing FKs so COPY can insert out of order
     SELECT 'ALTER TABLE '||conrelid::regclass||' DROP CONSTRAINT '||conname||';'
     FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace;
     -- run the generated DROP statements, then:
     psql $DATABASE_URL -f bkt.sql   -- re-adds the FKs itself at the end of the file
     ```
   - Verify after seeding: `SELECT count(*) FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace;` should be ~33, and spot-check row counts on `sports`, `teams`, `leagues`, `fixtures`, `users`, `wallets`.
3. **Build the API server** — `pnpm --filter @workspace/api-server run build` (must run before first start; the dev workflow does this automatically)
4. **Start workflows** — start both `artifacts/api-server: API Server` (port 8080) and `artifacts/gowin: web` (port 5000) via the Replit workflow panel
5. **Secrets** — `SESSION_SECRET` is set. SMTP vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM`, `SMTP_SECURE`) are set as env vars. `SMTP_PASS` must be added as a Replit Secret. `JWT_SECRET` is loaded from the database settings table on first boot; set it as a Replit Secret as a safe fallback.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only, non-interactive — use `psql $DATABASE_URL -c "..."` for raw SQL if drizzle-kit fails in non-TTY)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — email sending (nodemailer); gracefully skipped if not set

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (api-server routes use plain JS guards; libs use zod schemas from `@workspace/api-zod`)
- API codegen: Orval (from OpenAPI spec → `lib/api-client-react` + `lib/api-zod`)
- Build: esbuild (ESM bundle) — do NOT import `zod` directly in `api-server`; zod is not a direct dep there

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema.ts` — Drizzle ORM schema (source of truth for DB shape)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/email.ts` — nodemailer email service (OTP, temp password, lockout)
- `artifacts/gowin/src/contexts/AuthContext.tsx` — auth state, login/logout/refreshUser
- `artifacts/gowin/src/pages/` — all frontend pages

## Architecture decisions

- **OpenAPI-first**: all API changes must start in `openapi.yaml`, then `pnpm codegen` to regenerate hooks/schemas
- **Schema name collision rule**: orval generates Zod schemas named `<OperationId>Response`; component schema names in the spec must NOT match those names or index.ts re-export will conflict
- **No zod in api-server**: esbuild can't resolve `zod` as it's not a direct dep — use plain JS guards for request validation in route handlers
- **Password recovery**: 3 failed logins → `disabledReason: 'system'` (self-service reset unlocks); admin block → `disabledReason: 'admin'` (only admin can unblock); temp passwords set `mustChangePassword: true`
- **DB schema pushes**: `drizzle-kit push` fails in non-TTY; use raw `psql $DATABASE_URL -c "ALTER TABLE..."` instead

## Product

- Browse live & upcoming sports fixtures with real-time odds
- Place single and accumulator bets; track bet history and results
- Wallet: deposit, withdraw, view transaction history
- Admin: manage users (roles, wallet credit/debit, block/unblock, reset passwords), fixtures, bets, withdrawals, vouchers, settings, slides
- Password recovery: email OTP self-service reset; admin-issued temp password (1hr, shown in UI + optional email); 3-failed-login lockout with forced reset

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `drizzle-kit push` is non-interactive and will prompt in a TTY context — always use raw SQL for schema changes in this environment
- `zod` cannot be imported directly in `artifacts/api-server` — esbuild won't resolve it (not a direct dep)
- OpenAPI component schema names must not match `<operationId>Response` pattern or orval will generate duplicate exports in `lib/api-zod/src/index.ts`
- SMTP env vars are optional; `email.ts` logs a warning and returns `false` (not `void`) for email functions when unconfigured

## Canonical Ports

- Frontend (gowin): **20254** — set by `artifacts/gowin/.replit-artifact/artifact.toml` via `PORT=20254`. Do NOT override in workflow commands; the artifact config is the source of truth.
- API server: **8080** — set by `artifacts/api-server/.replit-artifact/artifact.toml`. Frontend Vite proxy forwards `/api`, `/slides-images`, and `/ws` to `localhost:8080`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
