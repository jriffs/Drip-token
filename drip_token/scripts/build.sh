#!/usr/bin/env bash
# Build the drip_token program (Codespaces / Anchor friendly)
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Building drip_token..."
anchor build

echo "==> Build complete."
echo "    Program keypair: target/deploy/drip_token-keypair.json"
echo "    IDL:             target/idl/drip_token.json"
