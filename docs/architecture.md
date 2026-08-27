# DripToken – Architecture Notes

Companion to the root `README.md`. This file expands account layout and mode handling without duplicating the full security model.

## Account Layout (canonical)

### Config PDA
- **Seeds**: `[b"config"]`
- **Bump**: stored in account
- **Space**: fixed (`InitSpace`)

| Field              | Type   | Notes |
|--------------------|--------|-------|
| admin              | Pubkey | Mutable via `update_config` |
| mint               | Pubkey | Immutable after `initialize` |
| vault              | Pubkey | Set via `set_vault`; may be default in Mint mode |
| claim_amount       | u64    | Exact amount per claim |
| cooldown_seconds   | u64    | 0 = disabled |
| daily_limit        | u64    | 0 = disabled |
| mode               | u8     | 0 = Mint, 1 = Transfer |
| paused             | bool   | Absolute for claims |
| bump               | u8     | |

### UserState PDA
- **Seeds**: `[b"user", user.key().as_ref()]`
- **Init**: `init_if_needed`
- **Bump**: stored

| Field          | Type | Notes |
|----------------|------|-------|
| last_claim_ts  | i64  | Unix timestamp of last successful claim |
| claimed_today  | u64  | Accumulated in current rolling window |
| last_day_ts    | i64  | Start of current 24 h window |
| bump           | u8   | |

**Rolling window**: when `now - last_day_ts >= 86_400`, reset `claimed_today = 0` and set `last_day_ts = now`. Even when `daily_limit == 0`, the implementation still writes `claimed_today = claim_amount` on success (field unused for enforcement).

## Mode Handling

| Mode | Value | Token movement | Authority / pre-check |
|------|-------|----------------|-----------------------|
| Mint | 0 | `token_interface::mint_to` | Config PDA must be mint authority |
| Transfer | 1 | `token_interface::transfer_checked` | Vault authority = Config PDA; balance **strictly >** claim_amount |

Current implementation always requires a vault token account in the `Claim` accounts struct, even when operating in Mint mode.

## Instruction Surface

| Instruction        | Signer          | Key constraints |
|--------------------|-----------------|-----------------|
| initialize         | future admin    | Config does not yet exist; mint set once |
| claim              | user            | pause + both limits + correct mint/vault/mode |
| update_config      | config.admin    | only allowed fields; mint immutable |
| set_vault          | config.admin    | new vault matches mint + Config authority |
| close_user_state   | user            | claimed_today == 0 and cooldown fully expired |
| mint_to_vault      | config.admin    | vault already authorised by Config |

## Design Decisions (locked)

- Dual mode (Mint + Transfer)
- Both cooldown and daily limit enforceable simultaneously
- Rolling 24 h window (exactly 86_400 s)
- State-before-effects mandatory
- Fixed claim amount (no client amount on `claim`)
- Mint immutable after initialize
- Clean-close only for UserState (Option B)
- Fixed-size accounts, no zero-copy
- Primary path uses `token_interface`

See `02-architecture-and-account-design.md` for the full decision log.
