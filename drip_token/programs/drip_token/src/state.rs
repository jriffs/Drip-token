//! Persistent account layouts for DripToken.
//!
//! - `Config`: global singleton PDA holding all faucet settings.
//! - `UserState`: per-user PDA tracking claim history for rate limiting (to protect against bad guys).

use anchor_lang::prelude::*;

/// Global faucet configuration (seeds = `[b"config"]`).
#[account]
#[derive(InitSpace)]
pub struct Config {
    /// Authority allowed to call admin instructions.
    pub admin: Pubkey,
    /// SPL token mint served by this faucet (immutable after initialize).
    pub mint: Pubkey,
    /// Token account used as the source in Transfer mode.
    pub vault: Pubkey,
    /// Exact number of tokens given on every successful claim.
    pub claim_amount: u64,
    /// Minimum seconds between claims for a user (0 = disabled).
    pub cooldown_seconds: u64,
    /// Maximum tokens claimable in a rolling 24 h window (0 = disabled).
    pub daily_limit: u64,
    /// 0 = Mint mode, 1 = Transfer mode.
    pub mode: u8,
    /// When true, all claims are rejected.
    pub paused: bool,
    /// Canonical bump for the Config PDA.
    pub bump: u8,
}

/// Per-user rate-limit state (seeds = `[b"user", user.key().as_ref()]`).
#[account]
#[derive(InitSpace)]
pub struct UserState {
    /// Unix timestamp of the last successful claim.
    pub last_claim_ts: i64,
    /// Tokens claimed inside the current rolling 24 h window.
    pub claimed_today: u64,
    /// Unix timestamp marking the start of the current 24 h window.
    pub last_day_ts: i64,
    /// Canonical bump for this UserState PDA.
    pub bump: u8,
}