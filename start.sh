#!/bin/bash
set -e

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install --frozen-lockfile
fi

# Build the API server if dist doesn't exist
if [ ! -f "artifacts/api-server/dist/index.mjs" ]; then
  echo "Building API server..."
  pnpm --filter @workspace/api-server run build
fi

# Start the API server in the background
echo "Starting API server on port 8080..."
pnpm --filter @workspace/api-server run dev &
API_PID=$!

# Start the frontend (webview) in the foreground
echo "Starting frontend on port 5000..."
pnpm --filter @workspace/gowin run dev &
FRONTEND_PID=$!

# Wait for either process to exit
wait -n $API_PID $FRONTEND_PID
