use anchor_lang::prelude::*;

use crate::state::*;
use crate::errors::*;
use crate::constants::*;

pub fn initialize_handler(ctx: Context<InitializeConfig>, claim_amount: u64, 
    cooldown_seconds: u64, 
    daily_limit: u64,
    mint: Pubkey, 
    mode: u8,
) -> Result<()> {
    require!(mode == MODE_MINT || mode == MODE_TRANSFER, ErrorCodes::InvalidMode);
    let config = &mut ctx.accounts.config;
    config.mode = mode;
    config.admin = ctx.accounts.admin.key();
    config.bump = ctx.bumps.config;
    config.claim_amount = claim_amount;
    config.cooldown_seconds = cooldown_seconds;
    config.daily_limit = daily_limit;
    config.mint = mint;
    config.paused = false;
    config.vault = Pubkey::default();

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}
