use anchor_lang::{declare_id, System};
use anchor_lang::context::Context;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::token::SetAuthority;
use spl_token::instruction::AuthorityType;
use anchor_spl::token;

declare_id!("4TfS2Ab15Kpvu19xMy4SMWcgdpqXFZNiqVvRkmiaKpTw");

#[program]
pub mod faucet {
    use anchor_spl::token::{MintTo, Transfer};
    use spl_token::solana_program::native_token::LAMPORTS_PER_SOL;
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        let (mint_authority, _mint_bump) = Pubkey::find_program_address(
            &[b"mint_authority"],
            ctx.program_id
        );

        let mint_cpi_accounts = SetAuthority {
            current_authority: ctx.accounts.payer.to_account_info().clone(),
            account_or_mint: ctx.accounts.token_mint.to_account_info()
        }; 

        token::set_authority(
            CpiContext::new(ctx.accounts.token_program.to_account_info().clone(), mint_cpi_accounts),
            AuthorityType::MintTokens,
            Some(mint_authority)
        )?;

        Ok(())
    }

    pub fn mint_for_me(ctx: Context<MintForMe>, mint_bump: u8, pda_bump: u8) -> ProgramResult {
        let cpi_accounts = MintTo {
            mint: ctx.accounts.token_mint.to_account_info().clone(),
            to: ctx.accounts.payer_associated_token_account.to_account_info().clone(),
            authority: ctx.accounts.mint_authority.to_account_info()
        };

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                &[&[b"mint_authority", &[mint_bump]]]
            ),
            LAMPORTS_PER_SOL
        )?;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer_associated_token_account.to_account_info().clone(),
                    to: ctx.accounts.program_associated_token_account.to_account_info().clone(),
                    authority: ctx.accounts.payer.to_account_info().clone()
                }
            ),
            LAMPORTS_PER_SOL
        )?;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.program_associated_token_account.to_account_info().clone(),
                    to: ctx.accounts.payer_associated_token_account.to_account_info().clone(),
                    authority: ctx.accounts.program_authority.clone()
                },
                &[&[b"program_wallet", &[pda_bump]]]
            ),
            LAMPORTS_PER_SOL
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = token_mint,
        associated_token::authority = program_authority
    )]
    pub token_associated: Account<'info, TokenAccount>,
    pub program_authority: AccountInfo<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(mint_bump: u8, pda_bump: u8)]
pub struct MintForMe<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = token_mint,
        associated_token::authority = payer
    )]
    pub payer_associated_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = program_authority
    )]
    pub program_associated_token_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [b"program_wallet"],
        bump = pda_bump
    )]
    pub program_authority: AccountInfo<'info>,
    #[account(
        seeds = [b"mint_authority"],
        bump = mint_bump
    )]
    pub mint_authority: AccountInfo<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>
}

#[account]
pub struct data {
    seeds: Vec<u8>,
    bump: u8,
}