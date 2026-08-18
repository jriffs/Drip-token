pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions; // Declares the instructions folder
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("2o9Tk9fUu9P7WVEZKpM5aVvFtfpgqbaydNHJLhvHSTxJ");

#[program]
pub mod drip_token {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        claim_amount: u64,
        cooldown_seconds: u64,
        daily_limit: u64,
        mint: Pubkey,
        mode: u8,
    ) -> Result<()> {
        handler(ctx, claim_amount, cooldown_seconds, daily_limit, mint, mode)
    }
}
