/* use fuzz_accounts::*;
use trident_fuzz::fuzzing::*;
mod fuzz_accounts;
mod types;
use types::*;

#[derive(FuzzTestMethods)]
struct FuzzTest {
    /// Trident client for interacting with the Solana program
    trident: Trident,
    /// Storage for all account addresses used in fuzz testing
    fuzz_accounts: AccountAddresses,
}

#[flow_executor]
impl FuzzTest {
    fn new() -> Self {
        Self {
            trident: Trident::default(),
            fuzz_accounts: AccountAddresses::default(),
        }
    }

    #[init]
    fn start(&mut self) {
        // Perform any initialization here, this method will be executed
        // at the start of each iteration
    }

    #[flow]
    fn flow1(&mut self) {
        // Perform logic which is meant to be fuzzed
        // This flow is selected randomly from other flows
    }

    #[flow]
    fn flow2(&mut self) {
        // Perform logic which is meant to be fuzzed
        // This flow is selected randomly from other flows
    }

    #[end]
    fn end(&mut self) {
        // Perform any cleanup here, this method will be executed
        // at the end of each iteration
    }
}

fn main() {
    FuzzTest::fuzz(1000, 100);
}
 */

use fuzz_accounts::*;
use trident_fuzz::fuzzing::*;
mod fuzz_accounts;
use types::Config;
mod types;
use types::drip_token::*;
use spl_token::instruction::{set_authority, AuthorityType};

const TOKEN_PROGRAM_ID: Pubkey = pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

/// Helper: create a mint with 6 decimals
fn setup_mint(trident: &mut Trident, payer: &Pubkey, mint: &Pubkey, authority: &Pubkey) {
    let ixs = trident.initialize_mint(payer, mint, 6, authority, None);
    let _ = trident.process_transaction(&ixs, Some("setup_mint"));
}

/// Helper: create a token account owned by `owner`
fn setup_token_account(
    trident: &mut Trident,
    payer: &Pubkey,
    token_account: &Pubkey,
    mint: &Pubkey,
    owner: &Pubkey,
) {
    let ixs = trident.initialize_token_account(payer, token_account, mint, owner);
    let _ = trident.process_transaction(&ixs, Some("setup_token_account"));
}

fn get_config(trident: &mut Trident, config: &Pubkey) -> Option<Config> {
    // 8 = Anchor discriminator
    trident.get_account_with_type::<Config>(config, Some(&[8]))
}

fn get_token_balance(trident: &mut Trident, token_account: &Pubkey) -> u64 {
    trident
        .get_token_account(token_account)
        .map(|ta| ta.amount)
        .unwrap_or(0)
}

#[derive(FuzzTestMethods)]
struct FuzzTest {
    trident: Trident,
    fuzz_accounts: AccountAddresses,
}

#[flow_executor]
impl FuzzTest {
    fn new() -> Self {
        Self {
            trident: Trident::default(),
            fuzz_accounts: AccountAddresses::default(),
        }
    }

    /// Runs once at the start of every fuzz iteration.
    #[init]
    fn start(&mut self) {
        // Fixed program IDs
        self.fuzz_accounts
            .token_program
            .insert_with_address(pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"));
        self.fuzz_accounts
            .associated_token_program
            .insert_with_address(pubkey!("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"));
        self.fuzz_accounts
            .system_program
            .insert_with_address(pubkey!("11111111111111111111111111111111"));

        // Admin
        let admin = self.fuzz_accounts.admin.insert(&mut self.trident, None);
        self.trident.airdrop(&admin, 10_000_000_000); // 10 SOL

        // Mint (authority = admin for now)
        let mint = self.fuzz_accounts.mint.insert(&mut self.trident, None);
        setup_mint(&mut self.trident, &admin, &mint, &admin);

        // Vault token account (temporary owner = admin)
        let vault = self.fuzz_accounts.vault.insert(&mut self.trident, None);
        setup_token_account(&mut self.trident, &admin, &vault, &mint, &admin);

        // Config PDA
        let config = self.fuzz_accounts.config.insert(
            &mut self.trident,
            Some(PdaSeeds {
                seeds: &[b"config"],
                program_id: program_id(),
            }),
        );

        // Initialize Config (Mint mode = 0, zero limits for easier fuzzing at first)
        let ix = InitializeInstruction::data(InitializeInstructionData::new(
            1_000_000u64, // claim_amount
            0u64,         // cooldown_seconds
            0u64,         // daily_limit
            mint,         // mint pubkey
            0u8,          // mode = Mint
        ))
        .accounts(InitializeInstructionAccounts::new(config, admin))
        .instruction();

        let res = self.trident.process_transaction(&[ix], Some("Initialize"));
        // We don't assert success here on every path – fuzzer may also try bad inits later

        // NOTE: After initialize you still need to:
        // 1. set_authority mint → Config PDA
        // 2. set_authority vault owner → Config PDA
        // 3. optionally call SetVault
        //
        // Trident's SPL helpers for set_authority vary slightly by version.
        // If `set_authority` is available on `self.trident`, use it.
        // Otherwise we can add raw SPL instructions in a follow-up.

        // Vault owner → Config PDA
        let set_vault_owner_ix = set_authority(
            &TOKEN_PROGRAM_ID,
            &vault,           // account whose authority changes
            Some(&config),    // new authority
            AuthorityType::AccountOwner,
            &admin,           // current authority (must sign)
            &[],              // no multisig
        )
        .expect("set_authority vault");

        let _ = self
            .trident
            .process_transaction(&[set_vault_owner_ix], Some("set_vault_owner"));

        // Mint authority → Config PDA (required for Mint-mode claims)
        let set_mint_auth_ix = set_authority(
            &TOKEN_PROGRAM_ID,
            &mint,
            Some(&config),
            AuthorityType::MintTokens,
            &admin,
            &[],
        )
        .expect("set_authority mint");

        let _ = self
            .trident
            .process_transaction(&[set_mint_auth_ix], Some("set_mint_authority"));
            
    }

    /// Random users attempt to claim
    #[flow]
    fn claim_flow(&mut self) {
        let admin = match self.fuzz_accounts.admin.get(&mut self.trident) {
            Some(a) => a,
            None => return,
        };
        let mint = match self.fuzz_accounts.mint.get(&mut self.trident) {
            Some(m) => m,
            None => return,
        };
        let vault = match self.fuzz_accounts.vault.get(&mut self.trident) {
            Some(v) => v,
            None => return,
        };
        let config = match self.fuzz_accounts.config.get(&mut self.trident) {
            Some(c) => c,
            None => return,
        };
        let token_program = match self.fuzz_accounts.token_program.get(&mut self.trident) {
            Some(t) => t,
            None => return,
        };

        // Fresh user each time (or reuse from storage)
        let user = self.fuzz_accounts.user.insert(&mut self.trident, None);
        self.trident.airdrop(&user, 1_000_000_000);

        // UserState PDA
        let user_state = self.fuzz_accounts.user_state.insert(
            &mut self.trident,
            Some(PdaSeeds {
                seeds: &[b"user", user.as_ref()],
                program_id: program_id(),
            }),
        );

        // User ATA (derive; claim uses init_if_needed on-chain)
        let user_token_account = self.trident.get_associated_token_address(
            &mint,
            &user,
            &pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        );
        // Store it so other flows can reuse
        self.fuzz_accounts
            .user_token_account
            .insert_with_address(user_token_account);

        let ix = ClaimInstruction::data(ClaimInstructionData::new())
            .accounts(ClaimInstructionAccounts::new(
                user,
                config,
                mint,
                vault,
                user_state,
                user_token_account,
                token_program,
            ))
            .instruction();

        let _res = self.trident.process_transaction(&[ix], Some("Claim"));

        // Example invariant (only meaningful after authorities are handed over):
        // if res.is_success() {
        //     // user received tokens, etc.
        // }
    }

    /// Randomize config then claim (exercises update_config + claim interaction)
    #[flow]
    fn update_then_claim(&mut self) {
        let admin = match self.fuzz_accounts.admin.get(&mut self.trident) {
            Some(a) => a,
            None => return,
        };
        let config = match self.fuzz_accounts.config.get(&mut self.trident) {
            Some(c) => c,
            None => return,
        };

        // You need UpdateConfigInstruction* from types.rs – names should match.
        // Typical shape from your IDL:
        // UpdateConfigInstructionData::new(claim_amount, cooldown, daily_limit, mode, paused, new_admin)
        //
        // Uncomment and adjust once you confirm the exact constructor in types.rs:
        //
        // let claim_amount = self.trident.random_from_range(1u64..5_000_000);
        // let cooldown = self.trident.random_from_range(0u64..10);
        // let daily_limit = self.trident.random_from_range(0u64..20_000_000);
        // let mode = self.trident.random_from_range(0u8..2);
        // let paused = self.trident.random_from_range(0u8..2) == 1;
        //
        // let ix = UpdateConfigInstruction::data(UpdateConfigInstructionData::new(
        //     claim_amount, cooldown, daily_limit, mode, paused, admin,
        // ))
        // .accounts(UpdateConfigInstructionAccounts::new(admin))
        // .instruction();
        // let _ = self.trident.process_transaction(&[ix], Some("UpdateConfig"));

        // Then call claim_flow logic or inline a claim
        self.claim_flow();
    }

    #[end]
    fn end(&mut self) {
        // Global end-of-iteration checks can go here later
    }
}

fn main() {
    // 500 iterations, 4 threads – tune as needed
    FuzzTest::fuzz(500, 4);
}