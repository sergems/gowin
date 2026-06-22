#!/bin/sh
set -e

echo "[entrypoint] Waiting for PostgreSQL to be ready..."
until pg_isready -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -q; do
  sleep 1
done
echo "[entrypoint] PostgreSQL is ready."

echo "[entrypoint] Applying database schema..."
psql "$DATABASE_URL" -f /app/scripts/schema.sql
echo "[entrypoint] Schema applied."

echo "[entrypoint] Starting API server..."
exec node --enable-source-maps /app/artifacts/api-server/dist/index.mjs
