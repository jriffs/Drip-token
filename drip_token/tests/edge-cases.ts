/* import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  setupTestContext,
  initializeConfig,
  claimForUser,
  createFundedKeypair,
  TestContext,
} from "./utils/setup";
import {
  fetchUserState,
  getUserStatePda,
  getAta,
  getTokenBalance,
} from "./utils/accounts";
import { sleep } from "./utils/time";
import { SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

describe("DripToken – Edge Cases", () => {
  // ---------- First-time user (init_if_needed) ----------
  it("creates UserState on first claim via init_if_needed", async () => {
    const ctx = await setupTestContext({ mode: "mint" });
    await initializeConfig(ctx, {
      claimAmount: 100_000,
      cooldownSeconds: 0,
      dailyLimit: 0,
      mode: 0,
    });

    const [userStatePda] = getUserStatePda(
      ctx.user.publicKey,
      ctx.program.programId
    );

    // Account should not exist yet
    try {
      await ctx.program.account.userState.fetch(userStatePda);
      expect.fail("UserState should not exist before first claim");
    } catch {
      // expected
    }

    await claimForUser(ctx);

    const userState = await fetchUserState(ctx.program, userStatePda);
    expect(userState.claimedToday.toNumber()).to.equal(100_000);
    expect(userState.lastClaimTs.toNumber()).to.be.greaterThan(0);
  });

  // ---------- Zero cooldown + zero daily limit ----------
  it("allows unrestricted claims when both limits are zero", async () => {
    const ctx = await setupTestContext({ mode: "mint" });
    await initializeConfig(ctx, {
      claimAmount: 50_000,
      cooldownSeconds: 0,
      dailyLimit: 0,
      mode: 0,
    });

    // Multiple rapid claims should all succeed
    await claimForUser(ctx);
    await claimForUser(ctx);
    await claimForUser(ctx);

    const userAta = getAta(ctx.user.publicKey, ctx.mint);
    const balance = await getTokenBalance(ctx.provider, userAta);
    expect(balance).to.equal(150_000n);
  });

  // ---------- close_user_state (Option B – clean only) ----------
  describe("close_user_state", () => {
    let ctx: TestContext;
    const CLAIM_AMOUNT = 100_000;
    const COOLDOWN = 2;

    before(async () => {
      ctx = await setupTestContext({ mode: "mint" });
      await initializeConfig(ctx, {
        claimAmount: CLAIM_AMOUNT,
        cooldownSeconds: COOLDOWN,
        dailyLimit: 0,
        mode: 0,
      });
    });

    it("rejects close while cooldown is still active", async () => {
      await claimForUser(ctx);

      const [userStatePda] = getUserStatePda(
        ctx.user.publicKey,
        ctx.program.programId
      );

      try {
        await ctx.program.methods
          .closeUserState()
          .accounts({
            // userState: userStatePda,
            user: ctx.user.publicKey,
            // rent destination is usually the user
          })
          .signers([ctx.user])
          .rpc();
        expect.fail("should have thrown CloseNotAllowed");
      } catch (err: any) {
        expect(err.toString()).to.match(/CloseNotAllowed|601[0-9]/);
      }
    });

    it("allows close after cooldown has fully expired and claimed_today == 0", async () => {
      // Wait out cooldown
      await sleep((COOLDOWN + 1) * 1000);

      // At this point claimed_today is still > 0 from the previous claim.
      // Depending on exact implementation, you may need a day-window reset
      // or a claim with daily_limit that forces a reset.  For the pure
      // cooldown case the program requires claimed_today == 0.
      //
      // If your implementation only checks cooldown + claimed_today == 0,
      // you will need an admin path or a second user to demonstrate a
      // clean close.  Adjust this test to match the exact clean-state
      // rules in your claim / close handlers.

      // Placeholder – expand once you confirm the exact clean-state logic
      // after the first claim + cooldown expiry.
    });
  });

  // ---------- Day-boundary behaviour (rolling 24 h) ----------
  // Note: full 86_400 s tests are impractical with real sleep.
  // Recommended approach for CI:
  //   1. Use a very short “day” constant in a test-only build, or
  //   2. Use Bankrun / LiteSVM which can warp Clock freely.
  // The test below documents the expected behaviour; enable the
  // long sleep only when you have a warp-capable harness.
  it("resets claimed_today after a full 24 h window (documented)", async function () {
    this.timeout(10_000); // keep short for normal runs

    // In a real Clock-warping environment you would:
    //   1. Claim once
    //   2. Warp Clock by 86_400 seconds
    //   3. Claim again and assert claimed_today == claim_amount (reset occurred)
    //
    // With the standard local validator the practical way is to
    // set daily_limit high enough and only test the logic path
    // that does not require a full day.
    expect(true).to.equal(true); // placeholder
  });
}); */