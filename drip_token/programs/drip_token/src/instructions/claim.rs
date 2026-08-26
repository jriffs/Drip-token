use anchor_lang::prelude::*;
// use anchor_spl::token;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{self, MintTo, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::state::*;
use crate::errors::ErrorCodes;
use crate::constants::*;
use crate::events::ClaimEvent;

pub fn claim_handler(ctx: Context<Claim>) -> Result<()> {
    
    let user_state = &mut ctx.accounts.user_state;
    let config = &ctx.accounts.config;

    // check if mode is correct (MINT or TRANSFER)
    require!(config.mode == MODE_MINT || config.mode == MODE_TRANSFER, ErrorCodes::InvalidMode);

    // first we check for all necessary conditions
    let now = Clock::get()?.unix_timestamp;

    // then check if cooldown period has elapsed
    if config.cooldown_seconds > 0 {
        let earliest = user_state.last_claim_ts
            .checked_add(config.cooldown_seconds as i64)
            .ok_or(ErrorCodes::ArithmeticOverflow)?;
        require!(now >= earliest, ErrorCodes::CooldownNotElapsed);
    }

    // then check if daily limit is reached
    // 1. Only enforce the daily limit if it is enabled
    if config.daily_limit > 0 {

        // 2. Check whether the current window has expired
        if now.checked_sub(user_state.last_day_ts).ok_or(ErrorCodes::ArithmeticOverflow)?  >= SECONDS_PER_DAY {
            // Window has expired - start a fresh window
            user_state.claimed_today = 0;
            user_state.last_day_ts = now;
        }

        // 3. Now check whether adding the new claim would exceed the limit
        //    (use checked arithmetic)
        let new_claimed = user_state.claimed_today
            .checked_add(config.claim_amount)
            .ok_or(ErrorCodes::ArithmeticOverflow)?;

        require!(
            new_claimed <= config.daily_limit,
            ErrorCodes::DailyLimitExceeded
        );

        // reset claimed_today
        user_state.claimed_today = new_claimed;
    } else {
        user_state.claimed_today = config.claim_amount;
    }

    // user state updated before any CPI for security purposes
    user_state.last_claim_ts = now;
        
    // since i can't assign the bump in the account struct
    // due to the init_if_needed flag being present
    user_state.bump = ctx.bumps.user_state; 

    // then check mode 
    match config.mode {
        MODE_MINT => {
            let cpi_program = ctx.accounts.token_program.key();
            let cpi_accounts = MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.config.to_account_info()
            };
            let bump = config.bump;
            let signer_seeds: &[&[&[u8]]] = &[&[
                CONFIG_SEED,
                &[bump],
            ]];
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            token_interface::mint_to(cpi_ctx, config.claim_amount)?;
        }
        MODE_TRANSFER => {
            // check vault amount
            let vault_balance = ctx.accounts.vault.amount;
            require!(vault_balance > config.claim_amount, ErrorCodes::InsufficientVaultBalance);
            let cpi_program = ctx.accounts.token_program.key();
            let cpi_accounts = TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            };
            let bump = config.bump;
            let signer_seeds: &[&[&[u8]]] = &[&[
                CONFIG_SEED,
                &[bump],
            ]];
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            token_interface::transfer_checked(
                cpi_ctx, 
                config.claim_amount, 
                ctx.accounts.mint.decimals
            )?;
        }
        _ => {}
    }

    // then we emit the claim event
    emit!(ClaimEvent {
        amount: config.claim_amount,
        mode: config.mode,
        user: ctx.accounts.user.key(),
        timestamp: now
    });

    Ok(())
}


#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

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
        token::authority = config, 
        token::mint = mint,
        token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        space = 8 + UserState::INIT_SPACE,
        payer = user,
        seeds = [USER_SEED, user.key().as_ref()],
        bump

    )]
    pub user_state: Account<'info, UserState>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::authority = user,
        associated_token::mint = mint,
        associated_token::token_program = token_program 
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}