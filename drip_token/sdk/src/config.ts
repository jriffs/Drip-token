import { Connection, PublicKey } from "@solana/web3.js";
import { Program, Idl } from "@coral-xyz/anchor";
import { getConfigPda } from "./pdas";
import { DEFAULT_PROGRAM_ID } from "./constants";
import { mapProgramError } from "./errors";

export interface ConfigAccount {
  admin: PublicKey;
  mint: PublicKey;
  vault: PublicKey;
  claimAmount: bigint;
  cooldownSeconds: bigint;
  dailyLimit: bigint;
  mode: number; // 0 = Mint, 1 = Transfer
  paused: boolean;
  bump: number;
}

/**
 * Fetch and deserialize the global Config PDA.
 */
export async function getConfig(
  connection: Connection,
  program: Program<Idl>,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<ConfigAccount> {
  const [configPda] = getConfigPda(programId);

  try {
    const raw = await (program.account as any).config.fetch(configPda);
    return {
      admin: raw.admin as PublicKey,
      mint: raw.mint as PublicKey,
      vault: raw.vault as PublicKey,
      claimAmount: BigInt(raw.claimAmount.toString()),
      cooldownSeconds: BigInt(raw.cooldownSeconds.toString()),
      dailyLimit: BigInt(raw.dailyLimit.toString()),
      mode: Number(raw.mode),
      paused: Boolean(raw.paused),
      bump: Number(raw.bump),
    };
  } catch (err) {
    throw new Error(
      mapProgramError(err) || `Config not found at ${configPda.toBase58()}`
    );
  }
}

export function getConfigAddress(
  programId: PublicKey = DEFAULT_PROGRAM_ID
): PublicKey {
  return getConfigPda(programId)[0];
}