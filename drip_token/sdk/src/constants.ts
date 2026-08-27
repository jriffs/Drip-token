import { PublicKey } from "@solana/web3.js";

/** Default program ID from Anchor.toml (feature-claim / localnet) */
export const DEFAULT_PROGRAM_ID = new PublicKey(
  "9vXiabzy5j6UujwQGb7tPwviA9B1GDBpmKnnsFWu5zSs"
);

/** PDA seeds – must match on-chain constants.rs */
export const CONFIG_SEED = Buffer.from("config");
export const USER_SEED = Buffer.from("user");

/** Mode flags – must match on-chain */
export const MODE_MINT = 0;
export const MODE_TRANSFER = 1;

/** Rolling daily window length in seconds */
export const SECONDS_PER_DAY = 86_400;