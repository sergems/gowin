#!/bin/bash
# db-seed.sh — Seed the database from btk.sql (full pg_dump).
# Run this on a fresh/empty Postgres instance, or after a DB reset.
# Usage: bash scripts/db-seed.sh
#
# NOTE: scripts/schema.sql is stale (missing tables/columns). Always use btk.sql.

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

if [ ! -f "btk.sql" ]; then
  echo "ERROR: btk.sql not found in repo root." >&2
  exit 1
fi

echo "Resetting public schema..."
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Importing btk.sql..."
psql "$DATABASE_URL" -f btk.sql

echo "Done. Database seeded from btk.sql."
