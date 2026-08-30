# DripToken – Security Notes

Companion to the root `README.md`. Full threat model and residual-risk discussion live in `03-security-model.md`. This file restates the invariants and operational security posture for auditors and operators.

## Core Invariants (must hold at all times)

1. Singleton Config (`[b"config"]`).
2. Unique UserState per user (`[b"user", user]`).
3. UserState updated **before** any mint/transfer CPI inside `claim`.
4. Claim amount is always exactly `config.claim_amount` (no client amount on the claim path).
5. `paused == true` rejects every claim.
6. Both cooldown and daily limit are enforced when their values are > 0.
7. Daily limit uses a rolling window of exactly 86_400 seconds from `last_day_ts`.
8. Mode safety:
   - Mint: Config PDA is mint authority.
   - Transfer: vault authority = Config PDA and balance strictly greater than `claim_amount`.
9. `config.mint` is immutable after `initialize`.
10. Only the stored `admin` can call admin instructions.
11. No debt / no over-mint on the claim path.
12. Fixed-size accounts only (no reallocation).
13. `close_user_state` allowed only when rate-limit state is fully clean.
14. `update_config` mutates only the documented allow-list of fields.
15. `mint_to_vault` is admin-only and separate from the user claim path.

## Access Control Summary

| Instruction        | Required signer     | Notes |
|--------------------|---------------------|-------|
| initialize         | future admin        | Config must not already exist |
| claim              | user                | pause + limits + accounts |
| update_config      | config.admin        | mint cannot be changed |
| set_vault          | config.admin        | vault must match mint + Config authority |
| close_user_state   | user (PDA owner)    | clean state only |
| mint_to_vault      | config.admin        | vault already authorised |

All PDAs are validated with seeds + bump constraints. Token accounts are validated with mint + authority/owner constraints.

## Error Codes (production)

| Code                        | When raised |
|-----------------------------|-------------|
| FaucetPaused                | Claim while paused |
| CooldownNotElapsed          | Cooldown still active |
| DailyLimitExceeded          | Would exceed daily limit |
| ArithmeticOverflow          | checked math failed |
| InvalidMode                 | mode not 0 or 1 |
| InsufficientVaultBalance    | vault ≤ claim_amount (Transfer) |
| InvalidMint                 | mint mismatch |
| InvalidVault                | wrong vault / authority |
| Unauthorized                | not current admin |
| AlreadyInitialized          | Config already exists |
| CannotCloseWithClaimedToday | claimed_today > 0 |
| CannotCloseDuringCooldown    | cooldown not fully expired |

## Residual Risks (accepted for v1)

- Admin key compromise grants full control of config, pause, vault funding, and mint authority (in Mint mode). Production recommendation: multisig or renounce upgrade authority after audit.
- Clock sysvar is trusted.
- No on-chain governance or multi-sig built into the program itself.
- Vault draining by a compromised admin is possible.
- External mint-authority changes (outside this program) are not defended against while in Mint mode.
- Vault account is required on every `claim` even in Mint mode (current implementation constraint).

## Operational Security Recommendations

- After final audit, prefer making the program immutable (renounce upgrade authority).
- Secure the admin key; treat it as a high-value operational secret.
- Pause first (`update_config` with `paused = true`) before sensitive vault or config changes when practical.
- Monitor `ClaimEvent` and vault balance (Transfer mode).
- Never rely on client-supplied amounts for claims; the program ignores them.

For the complete threat model and alignment table with architecture decisions, see `03-security-model.md`.
