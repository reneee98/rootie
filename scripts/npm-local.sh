#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v npm >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
  exec npm "$@"
fi

BUNDLED_NODE="$ROOT_DIR/.codex-tools/node/node-v22.22.2-darwin-arm64/bin/node"
BUNDLED_BIN_DIR="$ROOT_DIR/.codex-tools/node/node-v22.22.2-darwin-arm64/bin"
BUNDLED_NPM_CLI="$ROOT_DIR/.codex-tools/node/node-v22.22.2-darwin-arm64/lib/node_modules/npm/bin/npm-cli.js"

if [[ -x "$BUNDLED_NODE" && -f "$BUNDLED_NPM_CLI" ]]; then
  export PATH="$BUNDLED_BIN_DIR:$PATH"
  exec "$BUNDLED_NODE" "$BUNDLED_NPM_CLI" "$@"
fi

echo "ERROR: npm nie je dostupné."
echo "Nainštaluj Node.js 22+ (napr. brew install node) alebo použij codex-bundled node."
exit 1
