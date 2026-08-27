/* import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  setupTestContext,
  initializeConfig,
  claimForUser,
  TestContext,
} from "./utils/setup";
import { fetchConfig } from "./utils/accounts";

describe("DripToken – Pause", () => {
  let ctx: TestContext;
  const CLAIM_AMOUNT = 100_000;

  before(async () => {
    ctx = await setupTestContext({ mode: "mint" });
    await initializeConfig(ctx, {
      claimAmount: CLAIM_AMOUNT,
      cooldownSeconds: 0,
      dailyLimit: 0,
      mode: 0,
    });
  });

  it("rejects claims while paused", async () => {
    // Pause via update_config
    await ctx.program.methods
      .updateConfig(
        new anchor.BN(CLAIM_AMOUNT),
        new anchor.BN(0),
        new anchor.BN(0),
        0, // mode
        true, // paused
        ctx.admin.publicKey // keep same admin
      )
      .accounts({
        config: ctx.configPda,
        admin: ctx.admin.publicKey,
      })
      .signers([ctx.admin])
      .rpc();

    const config = await fetchConfig(ctx.program, ctx.configPda);
    expect(config.paused).to.equal(true);

    try {
      await claimForUser(ctx);
      expect.fail("should have thrown Paused");
    } catch (err: any) {
      expect(err.toString()).to.match(/Paused|601[0-9]/);
    }
  });

  it("allows claims after unpause", async () => {
    await ctx.program.methods
      .updateConfig(
        new anchor.BN(CLAIM_AMOUNT),
        new anchor.BN(0),
        new anchor.BN(0),
        0,
        false, // unpaused
        ctx.admin.publicKey
      )
      .accounts({
        config: ctx.configPda,
        admin: ctx.admin.publicKey,
      })
      .signers([ctx.admin])
      .rpc();

    await claimForUser(ctx); // should succeed
  });
}); */