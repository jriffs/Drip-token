import { PublicKey } from "@solana/web3.js";
import { CONFIG_SEED, USER_SEED, DEFAULT_PROGRAM_ID } from "./constants";

/** Derive the global Config PDA. Seeds: [b"config"] */
export function getConfigPda(
  programId: PublicKey = DEFAULT_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
}

/** Derive the per-user UserState PDA. Seeds: [b"user", user.key()] */
export function getUserStatePda(
  user: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_SEED, user.toBuffer()],
    programId
  );
}