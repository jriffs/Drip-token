import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, Idl, AnchorProvider } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getConfigPda, getUserStatePda } from "./pdas";
import { getConfig } from "./config";
import { DEFAULT_PROGRAM_ID } from "./constants";
import { throwMapped } from "./errors";

export interface ClaimResult {
  signature: string;
  amount: bigint;
  mode: number;
}

/**
 * Build and send the `claim` instruction.
 * Always supplies the vault account (required by current on-chain constraints).
 */
export async function claim(
  provider: AnchorProvider,
  program: Program<Idl>,
  user: PublicKey = provider.wallet.publicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<ClaimResult> {
  const [configPda] = getConfigPda(programId);
  const [userStatePda] = getUserStatePda(user, programId);

  const config = await getConfig(provider.connection, program, programId);

  const userAta = getAssociatedTokenAddressSync(config.mint, user, false);

  try {
    const txSig = await program.methods
      .claim()
      .accounts({
        user,
        config: configPda,
        mint: config.mint,
        vault: config.vault, // always required by current Claim accounts
        userState: userStatePda,
        userTokenAccount: userAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    return {
      signature: txSig,
      amount: config.claimAmount,
      mode: config.mode,
    };
  } catch (err) {
    throwMapped(err);
  }
}