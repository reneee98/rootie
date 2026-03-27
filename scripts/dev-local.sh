#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if lsof -tiTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 3000 je obsadený. Zastavujem starý next dev proces..."
  pkill -f "next dev" || true
  sleep 1
fi

if [[ -f ".next/dev/lock" ]] && ! pgrep -f "next dev" >/dev/null 2>&1; then
  rm -f ".next/dev/lock"
fi

exec ./scripts/npm-local.sh run dev -- --port 3000

