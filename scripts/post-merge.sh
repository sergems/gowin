#!/bin/bash
set -e

# Install all workspace dependencies
pnpm install --frozen-lockfile

# Build the API server (must run before dev workflow starts)
pnpm --filter @workspace/api-server run build

# NOTE: DB schema changes should be applied manually via raw psql in non-TTY environments.
# drizzle-kit push is interactive and will fail here (stdin closed).
# Use: psql $DATABASE_URL -c "ALTER TABLE ..." for schema changes,
# or: psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" && psql $DATABASE_URL -f btk.sql
# for a full fresh seed from the dump.
