//! Program-wide constants for DripToken.

/// Seed for the global Config PDA: `[b"config"]`
pub const CONFIG_SEED: &[u8] = b"config";

/// Seed for per-user UserState PDAs: `[b"user", user.key().as_ref()]`
pub const USER_SEED: &[u8] = b"user";

/// Mode flag: faucet mints new tokens (Config PDA will be mint authority)
pub const MODE_MINT: u8 = 0;

/// Mode flag: faucet transfers from a vault token account
pub const MODE_TRANSFER: u8 = 1;

/// Length of the rolling daily window in seconds (exactly 24 hours)
pub const SECONDS_PER_DAY: i64 = 86_400;
