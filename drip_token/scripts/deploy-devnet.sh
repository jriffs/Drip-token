#!/usr/bin/env bash
# Deploy (or upgrade) drip_token to Solana devnet
set -euo pipefail

cd "$(dirname "$0")/.."

CLUSTER="${CLUSTER:-devnet}"
WALLET="${ANCHOR_WALLET:-$HOME/.config/solana/id.json}"

echo "==> Deploying to $CLUSTER"
echo "    Wallet: $WALLET"

# Ensure we have SOL on the target cluster
solana config set --url "$CLUSTER" --keypair "$WALLET"
BALANCE=$(solana balance --lamports | awk '{print $1}')
if [[ "$BALANCE" -lt 500000000 ]]; then
  echo "    Low balance – requesting airdrop..."
  solana airdrop 2 || true
fi

anchor deploy --provider.cluster "$CLUSTER" --provider.wallet "$WALLET"

echo ""
echo "==> Deploy finished."
echo "    Record the Program ID printed above and (if new) update:"
echo "      - Anchor.toml  [programs.devnet]"
echo "      - sdk/src/constants.ts  DEFAULT_PROGRAM_ID (optional)"
echo "      - scripts that hard-code the ID"
