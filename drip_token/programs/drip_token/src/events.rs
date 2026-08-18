//! On-chain events emitted by my DripToken program.
//!
//! for explorers, indexers, and clients to observe successful claiming and closing UserState.

use anchor_lang::prelude::*;

/// Emitted on every successful claim.
#[event]
pub struct ClaimEvent {
    /// The user who claimed.
    pub user: Pubkey,
    /// Exact amount claimed (always equal to `config.claim_amount`).
    pub amount: u64,
    /// Unix timestamp of the claim.
    pub timestamp: i64,
    /// Mode used for this claim (`0` = Mint, `1` = Transfer).
    pub mode: u8,
}

/// Emitted when a user successfully closes their UserState and recovers rent.
#[event]
pub struct UserStateClosed {
    /// The user whose state was closed.
    pub user: Pubkey,
    /// Unix timestamp of the close.
    pub timestamp: i64,
}