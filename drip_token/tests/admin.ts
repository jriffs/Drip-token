/* import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, SystemProgram } from "@solana/web3.js";
import {
  setupTestContext,
  initializeConfig,
  createFundedKeypair,
  TestContext,
} from "./utils/setup";
import { getConfigPda, fetchConfig } from "./utils/accounts";

describe("DripToken – Admin Authority", () => {
  let ctx: TestContext;

  before(async () => {
    ctx = await setupTestContext({ mode: "mint" });
  });

  it("allows the designated admin to initialize", async () => {
    await initializeConfig(ctx, {
      claimAmount: 1_000_000,
      cooldownSeconds: 0,
      dailyLimit: 0,
      mode: 0,
    });

    const config = await fetchConfig(ctx.program, ctx.configPda);
    expect(config.admin.toBase58()).to.equal(ctx.admin.publicKey.toBase58());
  });

  it("rejects initialize when Config already exists", async () => {
    try {
      await ctx.program.methods
        .initialize(
          new anchor.BN(1_000_000),
          new anchor.BN(0),
          new anchor.BN(0),
          ctx.mint,
          0
        )
        .accounts({
          // config: ctx.configPda,
          admin: ctx.admin.publicKey,
          // mint: ctx.mint,
          // systemProgram: SystemProgram.programId,
        })
        .signers([ctx.admin])
        .rpc();
      expect.fail("should have thrown AlreadyInitialized");
    } catch (err: any) {
      expect(err.toString()).to.match(/AlreadyInitialized|0x0/);
    }
  });

  it("rejects update_config from a non-admin", async () => {
    const attacker = await createFundedKeypair(ctx.provider);

    try {
      await ctx.program.methods
        .updateConfig(
          new anchor.BN(2_000_000),
          new anchor.BN(0),
          new anchor.BN(0),
          0,
          false,
          attacker.publicKey
        )
        .accounts({
          config: ctx.configPda,
          admin: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();
      expect.fail("should have thrown Unauthorized");
    } catch (err: any) {
      expect(err.toString()).to.match(/Unauthorized|ConstraintHasOne|601[0-9]/);
    }
  });

  it("allows admin to update mutable fields", async () => {
    await ctx.program.methods
      .updateConfig(
        new anchor.BN(2_500_000),
        new anchor.BN(60),
        new anchor.BN(5_000_000),
        0,
        false,
        ctx.admin.publicKey
      )
      .accounts({
        config: ctx.configPda,
        admin: ctx.admin.publicKey,
      })
      .signers([ctx.admin])
      .rpc();

    const config = await fetchConfig(ctx.program, ctx.configPda);
    expect(config.claimAmount.toNumber()).to.equal(2_500_000);
    expect(config.cooldownSeconds.toNumber()).to.equal(60);
    expect(config.dailyLimit.toNumber()).to.equal(5_000_000);
  });

  it("rejects set_vault from a non-admin", async () => {
    // Only meaningful in transfer mode, but the authority check is the same
    const attacker = await createFundedKeypair(ctx.provider);

    try {
      await ctx.program.methods
        .setVault()
        .accounts({
          // config: ctx.configPda,
          // admin: attacker.publicKey,
          vault: ctx.mint, // dummy – will fail earlier on authority
          // mint: ctx.mint,
        })
        .signers([attacker])
        .rpc();
      expect.fail("should have thrown Unauthorized");
    } catch (err: any) {
      expect(err.toString()).to.match(/Unauthorized|ConstraintHasOne|601[0-9]/);
    }
  });
}); */