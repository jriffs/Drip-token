use trident_fuzz::fuzzing::*;

/// Storage for all account addresses used in fuzz testing.
///
/// This struct serves as a centralized repository for account addresses,
/// enabling their reuse across different instruction flows and test scenarios.
///
/// Docs: https://ackee.xyz/trident/docs/latest/trident-api-macro/trident-types/fuzz-accounts/
#[derive(Default)]
pub struct AccountAddresses {
    pub user: AddressStorage,

    pub config: AddressStorage,

    pub mint: AddressStorage,

    pub vault: AddressStorage,

    pub user_state: AddressStorage,

    pub user_token_account: AddressStorage,

    pub system_program: AddressStorage,

    pub token_program: AddressStorage,

    pub associated_token_program: AddressStorage,

    pub admin: AddressStorage,
}
