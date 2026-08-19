use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::*;
use crate::errors::ErrorCodes;
use crate::constants::*;
use crate::events::ClaimEvent;

pub fn claim_handler() -> Result<()> {
    Ok(())
}


#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = mint
    )]
    pub config: Account<'info, Config>,

    pub mint: Account<'info, Mint>,

    #[account(
        associated_token::authority = config,
        associated_token::mint = mint
    )]
    pub vault: Account<'info, TokenAccount>

    #[account(
        init_if_needed,
        space = 8 + UserState::INIT_SPACE,
        payer = user,
        seeds = [USER_SEED, user.key().as_ref())],
        bump

    )]
    pub user_state: Account<'info, UserState>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::authority = user,
        associated_token::mint = mint
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}