/* import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  setupTestContext,
  initializeConfig,
  claimForUser,
  TestContext,
} from "./utils/setup";
import {
  fetchConfig,
  fetchUserState,
  getUserStatePda,
  getAta,
  getTokenBalance,
} from "./utils/accounts";

describe("DripToken – Happy Path", () => {
  // ---------- Mint mode ----------
  describe("Mint mode", () => {
    let ctx: TestContext;
    const CLAIM_AMOUNT = 1_000_000; // 1 token with 6 decimals

    before(async () => {
      ctx = await setupTestContext({ mode: "mint" });
      await initializeConfig(ctx, {
        claimAmount: CLAIM_AMOUNT,
        cooldownSeconds: 0,
        dailyLimit: 0,
        mode: 0,
      });
    });

    it("initializes Config correctly", async () => {
      const config = await fetchConfig(ctx.program, ctx.configPda);
      expect(config.admin.toBase58()).to.equal(ctx.admin.publicKey.toBase58());
      expect(config.mint.toBase58()).to.equal(ctx.mint.toBase58());
      expect(config.claimAmount.toNumber()).to.equal(CLAIM_AMOUNT);
      expect(config.cooldownSeconds.toNumber()).to.equal(0);
      expect(config.dailyLimit.toNumber()).to.equal(0);
      expect(config.mode).to.equal(0);
      expect(config.paused).to.equal(false);
    });

    it("allows a first-time user to claim successfully", async () => {
      const userAta = getAta(ctx.user.publicKey, ctx.mint);
      const balanceBefore = await getTokenBalance(ctx.provider, userAta);

      await claimForUser(ctx);

      const balanceAfter = await getTokenBalance(ctx.provider, userAta);
      expect(balanceAfter - balanceBefore).to.equal(BigInt(CLAIM_AMOUNT));

      const [userStatePda] = getUserStatePda(
        ctx.user.publicKey,
        ctx.program.programId
      );
      const userState = await fetchUserState(ctx.program, userStatePda);
      expect(userState.claimedToday.toNumber()).to.equal(CLAIM_AMOUNT);
      expect(userState.lastClaimTs.toNumber()).to.be.greaterThan(0);
    });
  });

  // ---------- Transfer mode ----------
  describe("Transfer mode", () => {
    let ctx: TestContext;
    const CLAIM_AMOUNT = 500_000;
    const VAULT_FUND = 10_000_000;

    before(async () => {
      ctx = await setupTestContext({
        mode: "transfer",
        fundVaultAmount: VAULT_FUND,
      });
      await initializeConfig(ctx, {
        claimAmount: CLAIM_AMOUNT,
        cooldownSeconds: 0,
        dailyLimit: 0,
        mode: 1,
      });
    });

    it("allows a user to claim from the vault", async () => {
      const userAta = getAta(ctx.user.publicKey, ctx.mint);
      const balanceBefore = await getTokenBalance(ctx.provider, userAta);
      const vaultBefore = await getTokenBalance(ctx.provider, ctx.vault!);

      await claimForUser(ctx);

      const balanceAfter = await getTokenBalance(ctx.provider, userAta);
      const vaultAfter = await getTokenBalance(ctx.provider, ctx.vault!);

      expect(balanceAfter - balanceBefore).to.equal(BigInt(CLAIM_AMOUNT));
      expect(vaultBefore - vaultAfter).to.equal(BigInt(CLAIM_AMOUNT));
    });
  });
}); */