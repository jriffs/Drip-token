# DripToken – Operational Scripts

These scripts support the **localnet → devnet** workflow.  
Mainnet is intentionally out of scope for the current phase.

All TypeScript scripts use the existing SDK helpers under `sdk/src/`.  
Run them from the **project root** (`drip_token/`) after `yarn install` and `anchor build`.

## Prerequisites

- Solana CLI + Anchor (Codespaces environment is assumed)
- A funded wallet (devnet SOL)
- `ANCHOR_WALLET` or default `~/.config/solana/id.json`
- Program already built (`anchor build`)

## Quick reference

| Script / command | Purpose |
|------------------|---------|
| `./scripts/build.sh` | Clean build |
| `./scripts/deploy-devnet.sh` | Deploy (or upgrade) to devnet |
| `ts-node scripts/initialize.ts …` | Create Config PDA |
| `ts-node scripts/setup-mint-mode.ts …` | Transfer mint authority → Config PDA |
| `ts-node scripts/setup-transfer-mode.ts …` | Create vault + set_vault + optional fund |
| `ts-node scripts/health-check.ts` | Print Config + optional UserState |
| `ts-node scripts/update-config.ts …` | Change claim amount / limits / pause / admin |
| `ts-node scripts/claim.ts` | Perform a claim (for smoke testing) |

## Environment variables

```bash
# Optional overrides
export CLUSTER=devnet                    # default: devnet
export RPC_URL=https://api.devnet.solana.com
export PROGRAM_ID=<deployed-program-id>  # defaults to DEFAULT_PROGRAM_ID from sdk
export ANCHOR_WALLET=~/.config/solana/id.json
```

## Typical first-time flow (devnet)

```bash
# 1. Build
./scripts/build.sh

# 2. Deploy
./scripts/deploy-devnet.sh

# 3. Create a mint (or use an existing one)
spl-token create-token --decimals 6 --url devnet
# → note the MINT address

# 4. Initialize Config
ts-node scripts/initialize.ts \
  --mint <MINT> \
  --claim-amount 1000000 \
  --cooldown 60 \
  --daily-limit 5000000 \
  --mode 0

# 5a. Mint mode – give Config PDA mint authority
ts-node scripts/setup-mint-mode.ts --mint <MINT>

# 5b. (Alternative) Transfer mode
# ts-node scripts/setup-transfer-mode.ts --mint <MINT> --fund 100000000

# 6. Verify
ts-node scripts/health-check.ts

# 7. Smoke-test claim
ts-node scripts/claim.ts
```

See the main README **Deployment** section for the full checklist and authority model.
