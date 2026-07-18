#!/bin/bash
# setup-fresh.sh — Run once after a fresh import or container reset to initialize the project.
# Usage: bash scripts/setup-fresh.sh
set -e

echo "==> Installing workspace dependencies..."
pnpm install --frozen-lockfile

echo "==> Restoring database from btk.sql..."
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Ensure a Replit PostgreSQL database is attached."
  exit 1
fi
# Drop and recreate schema so the dump can insert rows before FK constraints are re-added at EOF
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "$DATABASE_URL" -f btk.sql
echo "==> Database restored."

echo "==> Building API server..."
pnpm --filter @workspace/api-server run build
echo "==> Build complete."

echo ""
echo "Setup complete. Start the app via the Replit workflow panel:"
echo "  - artifacts/api-server: API Server (port 8080)"
echo "  - artifacts/gowin: web (port 5000)"
echo ""
echo "Or use the 'Project' run button to start both at once."
