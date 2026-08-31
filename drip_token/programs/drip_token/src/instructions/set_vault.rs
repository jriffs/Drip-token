use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface,};

use crate::constants::*;
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

    pub mint: InterfaceAccount<'info, Mint>,

    /// New vault token account.
    /// Must be for the configured mint and owned by the Config PDA.
    #[account(
        associated_token::mint = mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}