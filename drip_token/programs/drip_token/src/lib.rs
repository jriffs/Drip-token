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
        initialize::initialize_handler(ctx, claim_amount, cooldown_seconds, daily_limit, mint, mode)
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
        update_config::update_config_handler(
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
        set_vault::set_vault_handler(ctx)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        claim::claim_handler(ctx)
    }

    pub fn close_user_state(ctx: Context<CloseUserState>) -> Result<()> {
        close_user_state::close_user_state_handler(ctx)
    }

    pub fn mint_to_vault(ctx: Context<MintToVault>, amount: u64) -> Result<()> {
        mint_to_vault::mint_to_vault_handler(ctx, amount)
    }
}
