import { Connection, PublicKey } from "@solana/web3.js";
import { Program, Idl } from "@coral-xyz/anchor";
import { getUserStatePda } from "./pdas";
import { DEFAULT_PROGRAM_ID } from "./constants";
import { mapProgramError } from "./errors";

export interface UserStateAccount {
  lastClaimTs: bigint;
  claimedToday: bigint;
  lastDayTs: bigint;
  bump: number;
}

/**
 * Fetch UserState for a user.
 * Returns `null` if the account has never been initialized.
 */
export async function getUserState(
  connection: Connection,
  program: Program<Idl>,
  user: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<UserStateAccount | null> {
  const [userStatePda] = getUserStatePda(user, programId);

  try {
    const raw = await (program.account as any).userState.fetch(userStatePda);
    return {
      lastClaimTs: BigInt(raw.lastClaimTs.toString()),
      claimedToday: BigInt(raw.claimedToday.toString()),
      lastDayTs: BigInt(raw.lastDayTs.toString()),
      bump: Number(raw.bump),
    };
  } catch (err: any) {
    // Account does not exist yet – expected for first-time users
    if (
      err?.message?.includes("Account does not exist") ||
      err?.message?.includes("could not find account") ||
      err?.code === 3012
    ) {
      return null;
    }
    throw new Error(mapProgramError(err));
  }
}

export function getUserStateAddress(
  user: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): PublicKey {
  return getUserStatePda(user, programId)[0];
}