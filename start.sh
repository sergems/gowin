#!/bin/bash
set -e

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install --frozen-lockfile
fi

# Start the frontend on port 5000 (API server runs via its own workflow)
echo "Starting frontend on port 5000..."
exec pnpm --filter @workspace/gowin run dev
