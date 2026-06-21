#!/bin/bash
set -e

# Start API server in background
pnpm --filter @workspace/api-server run dev &
API_PID=$!

# Start frontend (foreground — this is the webview process)
pnpm --filter @workspace/gowin run dev

# If frontend exits, kill the API server too
kill $API_PID 2>/dev/null || true
