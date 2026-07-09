---
name: DB push workaround
description: drizzle-kit push fails on interactive prompts in this non-TTY environment; use raw psql instead
---

- `drizzle-kit push` works for creating an initial schema on a fresh empty DB, but any interactive prompt (e.g. resolving ambiguous renames) hangs/fails since this environment is non-TTY. Use raw `psql $DATABASE_URL -c "ALTER TABLE ..."` for incremental schema changes instead.
- **Why:** no way to answer an interactive CLI prompt in this environment.
- **How to apply:** if `drizzle-kit push` errors or seems to hang waiting for input, drop to raw SQL rather than retrying it.
