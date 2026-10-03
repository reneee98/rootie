#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LISTENER_PIDS="$(lsof -tiTCP:3000 -sTCP:LISTEN || true)"
if [[ -n "$LISTENER_PIDS" ]]; then
  for listener_pid in $LISTENER_PIDS; do
    listener_cwd="$(lsof -a -p "$listener_pid" -d cwd -Fn | sed -n 's/^n//p')"
    listener_command="$(ps -p "$listener_pid" -o command=)"
    if [[ "$listener_cwd" != "$ROOT_DIR" || "$listener_command" != *next* ]]; then
      echo "Port 3000 používa iná aplikácia (PID $listener_pid). Uvoľni port alebo spusti npm run dev -- --port 3001."
      exit 1
    fi
  done
  echo "Zastavujem starý Rootie server na porte 3000..."
  for listener_pid in $LISTENER_PIDS; do
    kill "$listener_pid"
  done
  sleep 1
fi

exec ./scripts/npm-local.sh run dev -- --port 3000
