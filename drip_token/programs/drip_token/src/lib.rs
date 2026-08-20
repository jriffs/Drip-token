use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("9vXiabzy5j6UujwQGb7tPwviA9B1GDBpmKnnsFWu5zSs"); // replace with your real program ID later

#[program]
pub mod drip_token {
    use super::*;

    pub fn initialize(
        ctx: Context<InitializeConfig>,
        claim_amount: u64,
        cooldown_seconds: u64,
        daily_limit: u64,
        mint: Pubkey,
        mode: u8,
    ) -> Result<()> {
        instructions::initialize::initialize_handler(ctx, claim_amount, cooldown_seconds, daily_limit, mint, mode)
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        claim_amount: u64,
        cooldown_seconds: u64,
        daily_limit: u64,
        mode: u8,
        paused: bool,
        new_admin: Pubkey,
    ) -> Result<()> {
        instructions::update_config::update_config_handler(
            ctx,
            claim_amount,
            cooldown_seconds,
            daily_limit,
            mode,
            paused,
            new_admin,
        )
    }

    pub fn set_vault(ctx: Context<SetVault>) -> Result<()> {
        instructions::set_vault::set_vault_handler(ctx)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::claim::claim_handler(ctx)
    }

    pub fn close_user_state(ctx: Context<CloseUserState>) -> Result<()> {
        instructions::close_user_state::close_user_state_handler(ctx)
    }
}
