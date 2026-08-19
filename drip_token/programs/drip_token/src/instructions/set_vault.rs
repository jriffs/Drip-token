use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::constants::*;
use crate::errors::ErrorCodes;
use crate::state::Config;

pub fn set_vault_handler(ctx: Context<SetVault>) -> Result<()> {
    // Recommended: pause the faucet before changing the vault.
    // We do not enforce it on-chain to keep the instruction flexible.

    let config = &mut ctx.accounts.config;
    config.vault = ctx.accounts.vault.key();

    Ok(())
}

#[derive(Accounts)]
pub struct SetVault<'info> {
    #[account(
        mut,
        has_one = admin,
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    pub admin: Signer<'info>,

    /// New vault token account.
    /// Must be for the configured mint and owned by the Config PDA.
    #[account(
        token::mint = config.mint,
        token::authority = config
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}