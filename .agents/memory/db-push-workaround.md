---
name: DB push workaround
description: drizzle-kit push fails in non-TTY environments (Replit shell); use raw psql for schema changes.
---

`pnpm --filter @workspace/db run push` runs `drizzle-kit push --force` but still prompts for confirmation in some cases, causing it to hang or fail in non-interactive TTY contexts.

**Why:** drizzle-kit's push command may prompt "Are you sure?" for destructive changes even with `--force`. The Replit shell is non-interactive.

**How to apply:** Apply schema changes directly via psql:
```bash
psql $DATABASE_URL -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts integer NOT NULL DEFAULT 0;"
```
After making the psql changes, also update `lib/db/src/schema.ts` to keep the Drizzle schema in sync (so TypeScript types reflect the actual DB shape).
