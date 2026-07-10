---
name: DB push / fresh-import DB recovery workaround
description: drizzle-kit push fails non-TTY in this project; how to bootstrap a fresh empty Postgres instance instead.
---

`drizzle-kit push` (via `pnpm --filter @workspace/db run push`) can fail in this environment (observed: non-TTY prompt issues, and also a `type "serial" does not exist` error when pulling schema from a freshly created DB). Don't rely on it for fresh-import bootstrap.

**Working recovery path for a fresh/empty Replit Postgres instance:**
```
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $DATABASE_URL -f btk.sql
```
The dump filename has varied between imports (seen as `bt.sql`, now `btk.sql`) — check the repo root for the current `.sql` dump. It's a full pg_dump that creates its own tables/enums/data and adds FK constraints at the very end, so it doesn't depend on the push step running first.

**Why:** `scripts/schema.sql` looks like the idempotent bootstrap script but is stale — missing tables (`notifications`, `referral_rewards`) and newer columns that current code depends on. Applying it alone leaves the app in a broken state even though startup logs look clean at first (errors only surface once those tables/columns are queried).

**How to apply:** Use this whenever DATABASE_URL points to an empty/fresh Postgres and the app needs seeding — after a project import, DB reset, or when `db push` fails.
