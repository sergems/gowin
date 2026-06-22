#!/bin/bash
set -e

# The API server is managed by its own workflow (artifacts/api-server).
# This script only needs to start the frontend (webview) process.
pnpm --filter @workspace/gowin run dev
