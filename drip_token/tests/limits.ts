/* import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  setupTestContext,
  initializeConfig,
  claimForUser,
  TestContext,
} from "./utils/setup";
import {
  fetchUserState,
  getUserStatePda,
  getAta,
  getTokenBalance,
} from "./utils/accounts";
import { sleep, SECONDS_PER_DAY } from "./utils/time";

describe("DripToken – Limits (Cooldown + Daily)", () => {
  // ---------- Cooldown only ----------
  describe("Cooldown enforcement", () => {
    let ctx: TestContext;
    const CLAIM_AMOUNT = 100_000;
    const COOLDOWN = 3; // seconds – keep short for tests

    before(async () => {
      ctx = await setupTestContext({ mode: "mint" });
      await initializeConfig(ctx, {
        claimAmount: CLAIM_AMOUNT,
        cooldownSeconds: COOLDOWN,
        dailyLimit: 0, // disabled
        mode: 0,
      });
    });

    it("rejects claim while cooldown is active", async () => {
      await claimForUser(ctx); // first claim succeeds

      try {
        await claimForUser(ctx);
        expect.fail("should have thrown CooldownNotElapsed");
      } catch (err: any) {
        expect(err.toString()).to.match(/CooldownNotElapsed|601[0-9]/);
      }
    });

    it("allows claim after cooldown has elapsed", async () => {
      await sleep((COOLDOWN + 1) * 1000);
      await claimForUser(ctx); // should succeed
    });
  });

  // ---------- Daily limit only ----------
  describe("Daily limit enforcement", () => {
    let ctx: TestContext;
    const CLAIM_AMOUNT = 400_000;
    const DAILY_LIMIT = 1_000_000; // allows two claims, third fails

    before(async () => {
      ctx = await setupTestContext({ mode: "mint" });
      await initializeConfig(ctx, {
        claimAmount: CLAIM_AMOUNT,
        cooldownSeconds: 0,
        dailyLimit: DAILY_LIMIT,
        mode: 0,
      });
    });

    it("allows claims up to the daily limit", async () => {
      await claimForUser(ctx);
      await claimForUser(ctx); // 800k total – still under 1M
    });

    it("rejects claim that would exceed daily limit", async () => {
      try {
        await claimForUser(ctx); // would be 1.2M
        expect.fail("should have thrown DailyLimitExceeded");
      } catch (err: any) {
        expect(err.toString()).to.match(/DailyLimitExceeded|601[0-9]/);
      }
    });
  });

  // ---------- Dual limits ----------
  describe("Dual limits (cooldown + daily)", () => {
    let ctx: TestContext;
    const CLAIM_AMOUNT = 300_000;
    const COOLDOWN = 2;
    const DAILY_LIMIT = 1_000_000;

    before(async () => {
      ctx = await setupTestContext({ mode: "mint" });
      await initializeConfig(ctx, {
        claimAmount: CLAIM_AMOUNT,
        cooldownSeconds: COOLDOWN,
        dailyLimit: DAILY_LIMIT,
        mode: 0,
      });
    });

    it("enforces both constraints together", async () => {
      // Claim 1
      await claimForUser(ctx);

      // Immediate second claim → cooldown blocks
      try {
        await claimForUser(ctx);
        expect.fail("expected CooldownNotElapsed");
      } catch (err: any) {
        expect(err.toString()).to.match(/CooldownNotElapsed/);
      }

      // Wait out cooldown
      await sleep((COOLDOWN + 1) * 1000);

      // Claim 2 & 3 succeed (900k total)
      await claimForUser(ctx);
      await claimForUser(ctx);

      // Claim 4 would exceed daily limit
      try {
        await claimForUser(ctx);
        expect.fail("expected DailyLimitExceeded");
      } catch (err: any) {
        expect(err.toString()).to.match(/DailyLimitExceeded/);
      }
    });
  });
}); */