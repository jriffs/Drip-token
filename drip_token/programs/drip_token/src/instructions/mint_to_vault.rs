use anchor_lang::prelude::*;
// use anchor_spl::token;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{self, MintTo, Mint, TokenAccount, TokenInterface,};

use crate::state::*;
use crate::errors::ErrorCodes;
use crate::constants::*;



pub fn mint_to_vault_handler(ctx: Context<MintToVault>, amount: u64) -> Result<()> {
    require!(ctx.accounts.admin.key == &ctx.accounts.config.admin, ErrorCodes::Unauthorized);
    let cpi_program = ctx.accounts.token_program.key();
    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.config.to_account_info()
    };
    let bump = ctx.accounts.config.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        CONFIG_SEED,
        &[bump],
    ]];
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token_interface::mint_to(cpi_ctx, amount)?;
    Ok(())
}


#[derive(Accounts)]
pub struct MintToVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = mint,
        constraint = !config.paused @ ErrorCodes::FaucetPaused,
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}


