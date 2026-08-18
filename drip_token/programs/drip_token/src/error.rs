//! Custom error codes for DripToken.
//!
//! Every failure path in the program returns one of these variants.
//! I kept messages intentionally short and precise for clients and explorers.

use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // ─── Pause & Limits ──────────────────────────────────
    #[msg("Faucet is currently paused")]
    FaucetPaused,

    #[msg("Cooldown period has not elapsed")]
    CooldownNotElapsed,

    #[msg("Daily claim limit exceeded")]
    DailyLimitExceeded,

    // ─── Arithmetic ──────────────────────────────────────
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    // ─── Mode & Token accounts ───────────────────────────
    #[msg("Invalid faucet mode")]
    InvalidMode,

    #[msg("Vault has insufficient balance")]
    InsufficientVaultBalance,

    #[msg("Mint does not match Config")]
    InvalidMint,

    #[msg("Vault does not match Config or has wrong authority")]
    InvalidVault,

    // ─── Authority ───────────────────────────────────────
    #[msg("Only the admin can perform this action")]
    Unauthorized,

    // ─── Initialization ──────────────────────────────────
    #[msg("Config has already been initialized")]
    AlreadyInitialized,

    // ─── Close UserState (Option B) ──────────────────────
    #[msg("Cannot close UserState while claimed_today > 0")]
    CannotCloseWithClaimedToday,

    #[msg("Cannot close UserState while still in cooldown")]
    CannotCloseDuringCooldown,
}
