import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, Idl, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getConfigPda, getUserStatePda } from "./pdas";
import { DEFAULT_PROGRAM_ID, MODE_MINT, MODE_TRANSFER } from "./constants";
import { throwMapped } from "./errors";

/**
 * Initialize the global Config PDA (callable only once).
 */
export async function initialize(
  provider: AnchorProvider,
  program: Program<Idl>,
  params: {
    claimAmount: number | bigint;
    cooldownSeconds: number | bigint;
    dailyLimit: number | bigint;
    mint: PublicKey;
    mode: 0 | 1;
  },
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<string> {
  const [configPda] = getConfigPda(programId);
  const admin = provider.wallet.publicKey;

  if (params.mode !== MODE_MINT && params.mode !== MODE_TRANSFER) {
    throw new Error("mode must be 0 (Mint) or 1 (Transfer)");
  }

  try {
    return await program.methods
      .initialize(
        new BN(params.claimAmount.toString()),
        new BN(params.cooldownSeconds.toString()),
        new BN(params.dailyLimit.toString()),
        params.mint,
        params.mode
      )
      .accounts({
        config: configPda,
        admin,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  } catch (err) {
    throwMapped(err);
  }
}

/**
 * Update mutable Config fields. Mint is immutable.
 */
export async function updateConfig(
  provider: AnchorProvider,
  program: Program<Idl>,
  params: {
    claimAmount: number | bigint;
    cooldownSeconds: number | bigint;
    dailyLimit: number | bigint;
    mode: 0 | 1;
    paused: boolean;
    newAdmin: PublicKey;
  },
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<string> {
  const [configPda] = getConfigPda(programId);
  const admin = provider.wallet.publicKey;

  if (params.mode !== MODE_MINT && params.mode !== MODE_TRANSFER) {
    throw new Error("mode must be 0 (Mint) or 1 (Transfer)");
  }

  try {
    return await program.methods
      .updateConfig(
        new BN(params.claimAmount.toString()),
        new BN(params.cooldownSeconds.toString()),
        new BN(params.dailyLimit.toString()),
        params.mode,
        params.paused,
        params.newAdmin
      )
      .accounts({
        config: configPda,
        admin,
      })
      .rpc();
  } catch (err) {
    throwMapped(err);
  }
}

/**
 * Set / replace the vault token account.
 * New vault must belong to config.mint and be owned by the Config PDA.
 */
export async function setVault(
  provider: AnchorProvider,
  program: Program<Idl>,
  vault: PublicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<string> {
  const [configPda] = getConfigPda(programId);
  const admin = provider.wallet.publicKey;

  try {
    return await program.methods
      .setVault()
      .accounts({
        config: configPda,
        admin,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  } catch (err) {
    throwMapped(err);
  }
}

/**
 * Admin helper – mint tokens into the vault (useful for Transfer mode).
 */
export async function mintToVault(
  provider: AnchorProvider,
  program: Program<Idl>,
  params: {
    amount: number | bigint;
    mint: PublicKey;
    vault: PublicKey;
  },
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<string> {
  const [configPda] = getConfigPda(programId);
  const admin = provider.wallet.publicKey;

  try {
    return await program.methods
      .mintToVault(new BN(params.amount.toString()))
      .accounts({
        admin,
        config: configPda,
        mint: params.mint,
        vault: params.vault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
  } catch (err) {
    throwMapped(err);
  }
}

/**
 * Close the caller’s own UserState (Option B – only when clean).
 */
export async function closeUserState(
  provider: AnchorProvider,
  program: Program<Idl>,
  user: PublicKey = provider.wallet.publicKey,
  programId: PublicKey = DEFAULT_PROGRAM_ID
): Promise<string> {
  const [configPda] = getConfigPda(programId);
  const [userStatePda] = getUserStatePda(user, programId);

  try {
    return await program.methods
      .closeUserState()
      .accounts({
        user,
        config: configPda,
        userState: userStatePda,
      })
      .rpc();
  } catch (err) {
    throwMapped(err);
  }
}