use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::ErrorCodes;
use crate::events::UserStateClosed;
use crate::state::{Config, UserState};

pub fn close_user_state_handler(ctx: Context<CloseUserState>) -> Result<()> {
    let config = &ctx.accounts.config;
    let user_state = &ctx.accounts.user_state;
    let now = Clock::get()?.unix_timestamp;

    // Must have zero claimed_today
    require!(
        user_state.claimed_today == 0,
        ErrorCodes::CannotCloseWithClaimedToday
    );

    // Cooldown must be fully expired (or disabled)
    if config.cooldown_seconds > 0 {
        let earliest = user_state
            .last_claim_ts
            .checked_add(config.cooldown_seconds as i64)
            .ok_or(ErrorCodes::ArithmeticOverflow)?;

        require!(now >= earliest, ErrorCodes::CannotCloseDuringCooldown);
    }

    // Emit event before the account is closed
    emit!(UserStateClosed {
        user: ctx.accounts.user.key(),
        timestamp: now,
    });

    // Anchor will close the account and return rent to the user
    // because of the `close = user` constraint.
    Ok(())
}

#[derive(Accounts)]
pub struct CloseUserState<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        close = user,
        seeds = [USER_SEED, user.key().as_ref()],
        bump = user_state.bump
    )]
    pub user_state: Account<'info, UserState>,
}