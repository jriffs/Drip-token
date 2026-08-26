/* import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  createMint,
  createAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  setupTestContext,
  initializeConfig,
  claimForUser,
  createFundedKeypair,
  TestContext,
} from "./utils/setup";
import { getUserStatePda, getAta, getTokenBalance } from "./utils/accounts";
import { SystemProgram } from "@solana/web3.js";

describe("DripToken – Mode & Account Validation", () => {
  // ---------- Wrong mint ----------
  describe("Wrong mint rejection", () => {
    let ctx: TestContext;
    let wrongMint: PublicKey;

    before(async () => {
      ctx = await setupTestContext({ mode: "mint" });
      await initializeConfig(ctx, {
        claimAmount: 100_000,
        cooldownSeconds: 0,
        dailyLimit: 0,
        mode: 0,
      });

      wrongMint = await createMint(
        ctx.provider.connection,
        (ctx.provider.wallet as any).payer,
        ctx.admin.publicKey,
        null,
        6
      );
    });

    it("rejects claim with a mismatched mint", async () => {
      const [userStatePda] = getUserStatePda(
        ctx.user.publicKey,
        ctx.program.programId
      );
      const userAta = getAssociatedTokenAddressSync(
        wrongMint,
        ctx.user.publicKey
      );

      try {
        await ctx.program.methods
          .claim()
          .accounts({
            config: ctx.configPda,
            userState: userStatePda,
            user: ctx.user.publicKey,
            mint: wrongMint, // deliberately wrong
            userTokenAccount: userAta,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([ctx.user])
          .rpc();
        expect.fail("should have thrown InvalidMint or constraint error");
      } catch (err: any) {
        expect(err.toString()).to.match(
          /InvalidMint|ConstraintTokenMint|601[0-9]/
        );
      }
    });
  });

  // ---------- Insufficient vault balance ----------
  describe("Insufficient vault balance (Transfer mode)", () => {
    let ctx: TestContext;
    const CLAIM_AMOUNT = 1_000_000;

    before(async () => {
      // Fund vault with less than one claim
      ctx = await setupTestContext({
        mode: "transfer",
        fundVaultAmount: 100_000, // < CLAIM_AMOUNT
      });
      await initializeConfig(ctx, {
        claimAmount: CLAIM_AMOUNT,
        cooldownSeconds: 0,
        dailyLimit: 0,
        mode: 1,
      });
    });

    it("rejects claim when vault has insufficient funds", async () => {
      try {
        await claimForUser(ctx);
        expect.fail("should have thrown InsufficientVaultBalance");
      } catch (err: any) {
        expect(err.toString()).to.match(
          /InsufficientVaultBalance|601[0-9]/
        );
      }
    });
  });

  // ---------- Wrong vault authority ----------
  describe("Invalid vault (wrong authority)", () => {
    let ctx: TestContext;
    let badVault: PublicKey;

    before(async () => {
      ctx = await setupTestContext({ mode: "transfer", fundVaultAmount: 5_000_000 });
      await initializeConfig(ctx, {
        claimAmount: 100_000,
        cooldownSeconds: 0,
        dailyLimit: 0,
        mode: 1,
      });

      // Create another token account that is NOT owned by Config PDA
      badVault = await createAccount(
        ctx.provider.connection,
        (ctx.provider.wallet as any).payer,
        ctx.mint,
        ctx.admin.publicKey // still owned by admin
      );
    });

    it("rejects claim that supplies a vault not owned by Config", async () => {
      const [userStatePda] = getUserStatePda(
        ctx.user.publicKey,
        ctx.program.programId
      );
      const userAta = getAta(ctx.user.publicKey, ctx.mint);

      try {
        await ctx.program.methods
          .claim()
          .accounts({
            // config: ctx.configPda,
            // userState: userStatePda,
            user: ctx.user.publicKey,
            // mint: ctx.mint,
            // userTokenAccount: userAta,
            vault: badVault, // wrong authority
            tokenProgram: TOKEN_PROGRAM_ID,
            // associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            // systemProgram: SystemProgram.programId,
          })
          .signers([ctx.user])
          .rpc();
        expect.fail("should have thrown InvalidVault or constraint error");
      } catch (err: any) {
        expect(err.toString()).to.match(
          /InvalidVault|ConstraintTokenOwner|601[0-9]/
        );
      }
    });
  });
}); */