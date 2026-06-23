#!/bin/bash
set -e

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install --frozen-lockfile
fi

# Build API server if dist is missing
if [ ! -f "artifacts/api-server/dist/index.mjs" ]; then
  echo "Building API server..."
  pnpm --filter @workspace/api-server run build
fi

# Start the API server in the background on port 8080
echo "Starting API server on port 8080..."
PORT=8080 pnpm --filter @workspace/api-server run dev &
API_PID=$!

# Wait for the API server to be ready
echo "Waiting for API server..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/api/healthz > /dev/null 2>&1; then
    echo "API server ready."
    break
  fi
  sleep 1
done

# Start the frontend on port 5000 (proxies /api and /ws to the API server)
echo "Starting frontend on port 5000..."
exec pnpm --filter @workspace/gowin run dev
