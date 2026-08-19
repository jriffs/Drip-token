use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::*;
use crate::state::*;

pub fn update_config_handler(
    ctx: Context<UpdateConfig>,
    claim_amount: u64,
    cooldown_seconds: u64,
    daily_limit: u64,
    mode: u8,
    paused: bool,
    new_admin: Pubkey,
) -> Result<()> {
    require!(mode == MODE_MINT || mode == MODE_TRANSFER, ErrorCodes::InvalidMode);
    let config = &mut ctx.accounts.config;
    config.admin = new_admin;
    config.mode = mode;
    config.claim_amount = claim_amount;
    config.cooldown_seconds = cooldown_seconds;
    config.daily_limit = daily_limit;
    config.paused = paused;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        has_one = admin,
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    pub admin: Signer<'info>,
}
