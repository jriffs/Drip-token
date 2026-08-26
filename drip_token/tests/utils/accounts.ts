import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { DripToken } from "../../target/types/drip_token";

export const CONFIG_SEED = Buffer.from("config");
export const USER_SEED = Buffer.from("user");

export function getConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
}

export function getUserStatePda(
  user: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_SEED, user.toBuffer()],
    programId
  );
}

export function getAta(owner: PublicKey, mint: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, false);
}

/**
 * Creates a new mint. Returns the mint PublicKey.
 */
export async function createTestMint(
  provider: anchor.AnchorProvider,
  decimals = 6,
  mintAuthority?: PublicKey
): Promise<PublicKey> {
  const authority = mintAuthority ?? provider.wallet.publicKey;
  return createMint(
    provider.connection,
    (provider.wallet as any).payer,
    authority,
    null,
    decimals
  );
}

/**
 * Creates a token account owned by `owner` and optionally funds it.
 */
export async function createAndFundTokenAccount(
  provider: anchor.AnchorProvider,
  mint: PublicKey,
  owner: PublicKey,
  amount: number | bigint = 0
): Promise<PublicKey> {
  const tokenAccount = await createAccount(
    provider.connection,
    (provider.wallet as any).payer,
    mint,
    owner
  );

  if (BigInt(amount) > 0n) {
    await mintTo(
      provider.connection,
      (provider.wallet as any).payer,
      mint,
      tokenAccount,
      provider.wallet.publicKey,
      amount
    );
  }

  return tokenAccount;
}

export async function fetchConfig(
  program: Program<DripToken>,
  configPda: PublicKey
) {
  return program.account.config.fetch(configPda);
}

export async function fetchUserState(
  program: Program<DripToken>,
  userStatePda: PublicKey
) {
  return program.account.userState.fetch(userStatePda);
}

export async function getTokenBalance(
  provider: anchor.AnchorProvider,
  tokenAccount: PublicKey
): Promise<bigint> {
  try {
    const acc = await getAccount(provider.connection, tokenAccount);
    return acc.amount;
  } catch {
    return 0n;
  }
}