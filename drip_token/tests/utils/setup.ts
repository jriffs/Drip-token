import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAccount,
  mintTo,
  setAuthority,
  AuthorityType,
} from "@solana/spl-token";
import { DripToken } from "../../target/types/drip_token";
import {
  getConfigPda,
  getUserStatePda,
  createTestMint,
} from "./accounts";

// Shared across all test files for the lifetime of the validator
let sharedAdmin: Keypair | null = null;

export async function getSharedAdmin(
  provider: anchor.AnchorProvider
): Promise<Keypair> {
  if (sharedAdmin) return sharedAdmin;

  sharedAdmin = Keypair.generate();
  const sig = await provider.connection.requestAirdrop(
    sharedAdmin.publicKey,
    2 * anchor.web3.LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(sig, "confirmed");
  return sharedAdmin;
}

export interface TestContext {
  provider: anchor.AnchorProvider;
  program: Program<DripToken>;
  admin: Keypair;
  user: Keypair;
  mint: PublicKey;
  configPda: PublicKey;
  configBump: number;
  /** Token account owned by Config PDA – used in Transfer mode.
   *  In Mint mode we still pass a valid token account because the
   *  IDL always requires the `vault` account. */
  vault: PublicKey;
}

export async function createFundedKeypair(
  provider: anchor.AnchorProvider
): Promise<Keypair> {
  const kp = Keypair.generate();
  const sig = await provider.connection.requestAirdrop(
    kp.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(sig, "confirmed");
  return kp;
}

/**
 * Creates admin + user, mint, Config PDA, and a vault token account.
 * Even in Mint mode we create a vault because the claim instruction
 * always expects the account in the IDL.
 */
export async function setupTestContext(
  opts: {
    mode?: "mint" | "transfer";
    fundVaultAmount?: number;
  } = {}
): Promise<TestContext> {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.DripToken as Program<DripToken>;

  // ★ Use the same admin for every suite
  const admin = await getSharedAdmin(provider);
  const user = await createFundedKeypair(provider);

  const mint = await createTestMint(provider, 6, admin.publicKey);
  const [configPda, configBump] = getConfigPda(program.programId);

  const vault = await createAccount(
    provider.connection,
    (provider.wallet as any).payer,
    mint,
    admin.publicKey
  );

  if (opts.fundVaultAmount && opts.fundVaultAmount > 0) {
    await mintTo(
      provider.connection,
      (provider.wallet as any).payer,
      mint,
      vault,
      admin,
      opts.fundVaultAmount
    );
  }

  return {
    provider,
    program,
    admin,
    user,
    mint,
    configPda,
    configBump,
    vault,
  };
}

/**
 * Returns true if the Config PDA already exists.
 */
export async function configExists(ctx: TestContext): Promise<boolean> {
  try {
    await ctx.program.account.config.fetch(ctx.configPda);
    return true;
  } catch {
    return false;
  }
}

/**
 * Initializes Config only if it does not already exist.
 * If it exists, optionally updates the mutable fields to the desired values.
 */
export async function initializeConfig(
  ctx: TestContext,
  params: {
    claimAmount: number | bigint;
    cooldownSeconds: number | bigint;
    dailyLimit: number | bigint;
    mode: number; // 0 = Mint, 1 = Transfer
  }
): Promise<void> {
  const { program, admin, mint, configPda, vault } = ctx;

  const exists = await configExists(ctx);

  if (!exists) {
    // First-time initialization
    await program.methods
      .initialize(
        new anchor.BN(params.claimAmount),
        new anchor.BN(params.cooldownSeconds),
        new anchor.BN(params.dailyLimit),
        mint,
        params.mode
      )
      .accounts({
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    // Hand over mint authority (Mint mode)
    if (params.mode === 0) {
      await setAuthority(
        ctx.provider.connection,
        (ctx.provider.wallet as any).payer,
        mint,
        admin,
        AuthorityType.MintTokens,
        configPda
      );
    }

    // Always give vault ownership to Config + register it
    await setAuthority(
      ctx.provider.connection,
      (ctx.provider.wallet as any).payer,
      vault,
      admin,
      AuthorityType.AccountOwner,
      configPda
    );

    await program.methods
      .setVault()
      .accounts({
        // admin: admin.publicKey,
        vault,
      })
      .signers([admin])
      .rpc();
  } else {
    // Config already exists – just update the mutable fields we care about
    await program.methods
      .updateConfig(
        new anchor.BN(params.claimAmount),
        new anchor.BN(params.cooldownSeconds),
        new anchor.BN(params.dailyLimit),
        params.mode,
        false,                    // paused = false
        admin.publicKey           // keep current admin (or the one that can sign)
      )
      .accounts({
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();
  }
}

/**
 * Performs a claim for the given user.
 * Matches the exact account list from the IDL.
 */
export async function claimForUser(
  ctx: TestContext,
  user: Keypair = ctx.user
): Promise<string> {
  const [userStatePda] = getUserStatePda(user.publicKey, ctx.program.programId);
  const userAta = getAssociatedTokenAddressSync(ctx.mint, user.publicKey);

  return ctx.program.methods
    .claim()
    .accounts({
      user: user.publicKey,
      // config: ctx.configPda,
      // mint: ctx.mint,
      vault: ctx.vault,                    // always required by IDL
      // userState: userStatePda,
      // userTokenAccount: userAta,
      // systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      // associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([user])
    .rpc();
}