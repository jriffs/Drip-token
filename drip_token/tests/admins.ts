import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
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
    createMint
} from "@solana/spl-token";
import { DripToken } from "../target/types/drip_token";
import {
    getConfigPda,
    getUserStatePda,
    createTestMint,
    fetchConfig,
    fetchUserState,
    getAta,
    getTokenBalance
} from "./utils/accounts";
import { createFundedKeypair } from "./utils/setup";
import { sleep, SECONDS_PER_DAY } from "./utils/time";

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


export async function claimForUser(
    ctx: TestContext
): Promise<string> {
    const [userStatePda] = getUserStatePda(ctx.user.publicKey, ctx.program.programId);
    const userAta = getAssociatedTokenAddressSync(ctx.mint, ctx.user.publicKey);

    return ctx.program.methods
        .claim()
        .accounts({
            user: ctx.user.publicKey,
            // config: ctx.configPda,
            // mint: ctx.mint,
            vault: ctx.vault,                    // always required by IDL
            // userState: userStatePda,
            // userTokenAccount: userAta,
            // systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            // associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([ctx.user])
        .rpc();
}


describe("DripToken – All tests", () => {
    // first thing to do is provide the provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    // then the program
    const program = anchor.workspace.DripToken as Program<DripToken>;

    let admin: Keypair;
    let mint: PublicKey;
    let vault: PublicKey;
    let configPda: PublicKey;
    let configBump: number;

    before(async () => {
        // then accounts
        admin = await createFundedKeypair(provider);

        // then we create the accounts, starting with mint
        mint = await createTestMint(provider, 6, admin.publicKey); // will transfer authority to config later
        vault = await createAccount(
            provider.connection,
            (provider.wallet as any).payer,
            mint,
            admin.publicKey, // will also transfer this to config
        );
        await program.methods.initialize(
            new anchor.BN(500_000),
            new anchor.BN(0),
            new anchor.BN(0),
            mint,
            0
        ).accounts({
            admin: admin.publicKey,
        }).signers([admin]).rpc();

        const [pda, bump] = getConfigPda(program.programId);
        configPda = pda;
        configBump = bump;

        // handover mint & vault to config
        await setAuthority(
            provider.connection,
            (provider.wallet as any).payer,
            mint,
            admin,
            AuthorityType.MintTokens,
            configPda
        );

        await setAuthority(
            provider.connection,
            (provider.wallet as any).payer,
            vault,
            admin,
            AuthorityType.AccountOwner,
            configPda
        );
        console.log(`admin is -> ${admin.publicKey}`);
        console.log(`mint is -> ${mint}`);
        console.log(`vault is -> ${vault}`);
    });

    // --------------- ADMIN AUTHORITY AND MUTATIONS ---------------------- //
    it("allows the designated admin to initialize", async () => {
        const config = await fetchConfig(program, configPda);
        expect(config.admin.toBase58()).to.equal(admin.publicKey.toBase58());
    });

    it("rejects initialize when Config already exists", async () => {
        try {
            await program.methods
                .initialize(
                    new anchor.BN(1_000_000),
                    new anchor.BN(0),
                    new anchor.BN(0),
                    mint,
                    0
                )
                .accounts({
                    // config: ctx.configPda,
                    admin: admin.publicKey,
                    // mint: ctx.mint,
                    // systemProgram: SystemProgram.programId,
                })
                .signers([admin])
                .rpc();
            expect.fail("should have thrown AlreadyInitialized");
        } catch (err: any) {
            expect(err.toString()).to.match(/AlreadyInitialized|0x0/);
        }
    });

    it("rejects update_config from a non-admin", async () => {
        const attacker = await createFundedKeypair(provider);

        try {
            await program.methods
                .updateConfig(
                    new anchor.BN(2_000_000),
                    new anchor.BN(0),
                    new anchor.BN(0),
                    0,
                    false,
                    attacker.publicKey
                )
                .accounts({
                    config: configPda,
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
        await program.methods
            .updateConfig(
                new anchor.BN(2_500_000),
                new anchor.BN(60),
                new anchor.BN(5_000_000),
                0,
                false,
                admin.publicKey
            )
            .accounts({
                config: configPda,
                admin: admin.publicKey,
            })
            .signers([admin])
            .rpc();

        const config = await fetchConfig(program, configPda);
        expect(config.claimAmount.toNumber()).to.equal(2_500_000);
        expect(config.cooldownSeconds.toNumber()).to.equal(60);
        expect(config.dailyLimit.toNumber()).to.equal(5_000_000);
    });

    it("rejects set_vault from a non-admin", async () => {
        // Only meaningful in transfer mode, but the authority check is the same
        const attacker = await createFundedKeypair(provider);

        try {
            await program.methods
                .setVault()
                .accountsStrict({
                    admin: attacker.publicKey, // now i can fake the admin in strict mode!
                    config: configPda,     // then explicitly pass config since auto-resolve is off
                    vault: vault,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([attacker])
                .rpc();
            expect.fail("should have thrown Unauthorized");
        } catch (err: any) {
            expect(err.toString()).to.match(/Unauthorized|ConstraintHasOne|601[0-9]/);
        }
    });

    // ---------------------------- EDGE CASES ------------------------------//

    // ---------- First-time user (init_if_needed) ----------
    it("creates UserState on first claim via init_if_needed", async () => {
        const user = await createFundedKeypair(provider);
        const userATA = getAssociatedTokenAddressSync(mint, user.publicKey);
        const [userStatePda] = getUserStatePda(
            user.publicKey,
            program.programId
        );

        // Account should not exist yet
        try {
            await program.account.userState.fetch(userStatePda);
            expect.fail("UserState should not exist before first claim");
        } catch {
            // expected
        }

        await program.methods.claim()
            .accounts({
                user: user.publicKey,
                vault: vault,
                tokenProgram: TOKEN_PROGRAM_ID
            }).signers([user]).rpc();

        const userState = await fetchUserState(program, userStatePda);
        const config = await fetchConfig(program, configPda);
        expect(userState.claimedToday.toNumber()).to.equal(config.claimAmount.toNumber());
        expect(userState.lastClaimTs.toNumber()).to.be.greaterThan(0);
    });

    // ---------- Zero cooldown + zero daily limit ----------
    it("allows unrestricted claims when both limits are zero", async () => {
        const new_user = await createFundedKeypair(provider);
        await program.methods.updateConfig(
            new anchor.BN(500_000),
            new anchor.BN(0),
            new anchor.BN(0),
            0,
            false,
            admin.publicKey
        ).accounts({
            admin: admin.publicKey,
        }).signers([admin]).rpc();

        // Multiple rapid claims should all succeed
        await claimForUser({ admin, mint, vault, user: new_user, program, provider, configPda, configBump });
        await claimForUser({ admin, mint, vault, user: new_user, program, provider, configPda, configBump });
        await claimForUser({ admin, mint, vault, user: new_user, program, provider, configPda, configBump });

        const userAta = getAta(new_user.publicKey, mint);
        const balance = await getTokenBalance(provider, userAta);
        expect(balance).to.equal(1_500_000n);
    });

    it("rejects close while cooldown is still active", async () => {
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump }
        await claimForUser(ctx);

        const [userStatePda] = getUserStatePda(
            ctx.user.publicKey,
            ctx.program.programId
        );

        try {
            await program.methods.claim()
                .accounts({
                    user: new_user.publicKey,
                    vault: ctx.vault,
                    tokenProgram: TOKEN_PROGRAM_ID,
                }).signers([new_user]).rpc();
        } catch (err: any) {

        }

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


    // ---------------------------- HAPPY PATH ------------------------------//
    // -------- mint mode -----------
    it("allows a first-time user to claim successfully", async () => {
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump }
        const config = await fetchConfig(program, configPda);
        const CLAIM_AMOUNT = config.claimAmount;
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
        expect(userState.claimedToday.toNumber()).to.equal(CLAIM_AMOUNT.toNumber());
        expect(userState.lastClaimTs.toNumber()).to.be.greaterThan(0);
    });

    //-------- transfer mode -------------
    it("allows a user to claim from the vault", async () => {
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump }
        const config = await fetchConfig(program, configPda);
        const userAta = getAta(ctx.user.publicKey, ctx.mint);
        const balanceBefore = await getTokenBalance(ctx.provider, userAta);

        // first mint to vault
        await program.methods.mintToVault(new anchor.BN(100_000_000))
            .accounts({
                admin: ctx.admin.publicKey,
                vault: ctx.vault,
                tokenProgram: TOKEN_PROGRAM_ID
            }).signers([ctx.admin]).rpc();
        // then update config to transfer mode
        await program.methods
            .updateConfig(
                new anchor.BN(2_000_000),
                new anchor.BN(2),
                new anchor.BN(0),
                1,
                false,
                ctx.admin.publicKey
            )
            .accounts({
                config: configPda,
                admin: ctx.admin.publicKey,
            })
            .signers([ctx.admin])
            .rpc();

        const vaultBefore = await getTokenBalance(ctx.provider, ctx.vault!);

        await claimForUser(ctx);

        const balanceAfter = await getTokenBalance(ctx.provider, userAta);
        const vaultAfter = await getTokenBalance(ctx.provider, ctx.vault!);

        expect(balanceAfter - balanceBefore).to.equal(BigInt(2_000_000));
        expect(vaultBefore - vaultAfter).to.equal(BigInt(2_000_000));
    });

    // ---------------------------- LIMITS ------------------------------//
    it("rejects claim while cooldown is active", async () => {
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump }
        const config = await fetchConfig(program, configPda);
        const CLAIM_AMOUNT = config.claimAmount;
        const COOLDOWN = 3;
        const userAta = getAta(ctx.user.publicKey, ctx.mint);
        const balanceBefore = await getTokenBalance(ctx.provider, userAta);
        await claimForUser(ctx); // first claim succeeds

        try {
            await claimForUser(ctx);
            expect.fail("should have thrown CooldownNotElapsed");
        } catch (err: any) {
            expect(err.toString()).to.match(/CooldownNotElapsed|601[0-9]/);
        }
    });

    it("allows claim after cooldown has elapsed", async () => {
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump }
        const config = await fetchConfig(program, configPda);
        const CLAIM_AMOUNT = config.claimAmount;
        const COOLDOWN = 3;
        const userAta = getAta(ctx.user.publicKey, ctx.mint);
        await claimForUser(ctx); // first claim succeeds
        await sleep((COOLDOWN + 1) * 1000);
        await claimForUser(ctx); // should succeed
        const userTokenBalance = await getTokenBalance(ctx.provider, userAta);
        expect(userTokenBalance).to.equal(BigInt(CLAIM_AMOUNT * 2));
    });

    it("allows claims up to the daily limit", async () => {
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump };
        const COOLDOWN = 3;

        await program.methods
            .updateConfig(
                new anchor.BN(500_000),
                new anchor.BN(2),
                new anchor.BN(2_000_000),
                1,
                false,
                ctx.admin.publicKey
            )
            .accounts({
                config: configPda,
                admin: ctx.admin.publicKey,
            })
            .signers([ctx.admin])
            .rpc();

        await claimForUser(ctx);
        await sleep((COOLDOWN + 1) * 1000);
        await claimForUser(ctx);
        await sleep((COOLDOWN + 1) * 1000);
        await claimForUser(ctx); // 1.5M total – still under 2M
    });

    it("rejects claim that would exceed daily limit", async () => {
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump }
        const config = await fetchConfig(program, configPda);
        const CLAIM_AMOUNT = config.claimAmount;
        const COOLDOWN = 3;
        const userAta = getAta(ctx.user.publicKey, ctx.mint);

        await program.methods
            .updateConfig(
                new anchor.BN(500_000),
                new anchor.BN(0),
                new anchor.BN(500_000),
                1,
                false,
                ctx.admin.publicKey
            )
            .accounts({
                config: configPda,
                admin: ctx.admin.publicKey,
            })
            .signers([ctx.admin])
            .rpc();

        await claimForUser(ctx); // this should succeed

        try {
            await claimForUser(ctx); // would be 1M
            expect.fail("should have thrown DailyLimitExceeded");
        } catch (err: any) {
            expect(err.toString()).to.match(/DailyLimitExceeded|601[0-9]/);
        }
    });

    it("enforces both constraints together", async () => {
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump }
        const config = await fetchConfig(program, configPda);
        const COOLDOWN = 2;

        await program.methods
            .updateConfig(
                new anchor.BN(500_000),
                new anchor.BN(2),
                new anchor.BN(1_500_000),
                1,
                false,
                ctx.admin.publicKey
            )
            .accounts({
                config: configPda,
                admin: ctx.admin.publicKey,
            })
            .signers([ctx.admin])
            .rpc();
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

        // Claim 2 & 3 succeed ( 1.5M total)
        await claimForUser(ctx);

        await sleep((COOLDOWN + 1) * 1000);
        await claimForUser(ctx);

        // Claim 4 would exceed daily limit
        try {
            await sleep((COOLDOWN + 1) * 1000);
            await claimForUser(ctx);
            expect.fail("expected DailyLimitExceeded");
        } catch (err: any) {
            expect(err.toString()).to.match(/DailyLimitExceeded/);
        }
    });


    // ---------------------------- MODE & ACCOUNT VALIDATION ------------------------------//
    it("rejects claim with a mismatched mint", async () => {
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump }
        let wrongMint = await createMint(
            ctx.provider.connection,
            (ctx.provider.wallet as any).payer,
            ctx.admin.publicKey,
            null,
            6
        );
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
                .accountsStrict({
                    config: ctx.configPda,
                    userState: userStatePda,
                    user: ctx.user.publicKey,
                    mint: wrongMint, // deliberately wrong
                    vault: ctx.vault,
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
                /InvalidMint|ConstraintHasOne|200[0-9]/
            );
        }
    });

    it("rejects claim when vault has insufficient funds", async () => {
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump }
        const config = await fetchConfig(program, configPda);
        const vaultbalance = await getTokenBalance(ctx.provider, vault);
        const CLAIM_AMOUNT = config.claimAmount;
        const userAta = getAta(ctx.user.publicKey, ctx.mint);
        // update config, set claim amount to the exact vault balance
        await program.methods
            .updateConfig(
                new anchor.BN(vaultbalance),
                new anchor.BN(2),
                new anchor.BN(200_000_000),
                1,
                false,
                ctx.admin.publicKey
            )
            .accounts({
                config: configPda,
                admin: ctx.admin.publicKey,
            })
            .signers([ctx.admin])
            .rpc();
        try {
            await claimForUser(ctx);
            expect.fail("should have thrown InsufficientVaultBalance");
        } catch (err: any) {
            expect(err.toString()).to.match(
                /InsufficientVaultBalance|601[0-9]/
            );
        }
    });

    it("rejects claim that supplies a vault not owned by Config", async () => {
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump }
        const dummyOwner = anchor.web3.Keypair.generate();

        // 2. Create the bad vault owned by the dummy address
        const badVault = await createAccount(
            provider.connection,
            (provider.wallet as any).payer,
            mint,
            dummyOwner.publicKey
        );


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
            console.log(`RAW ERROR DEBUG -> ${err.toString()}`);
            expect(err.toString()).to.match(
                /InvalidVault|ConstraintTokenOwner|2015|601[0-9]|Provided owner is not allowed/
            );
        }
    });

    // ----------------------------------- PAUSES ----------------------------------------//
    it("rejects claims while paused", async () => {
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump }
        const userAta = getAta(ctx.user.publicKey, ctx.mint);
        // Pause via update_config
        await ctx.program.methods
            .updateConfig(
                new anchor.BN(500_000),
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
        const new_user = await createFundedKeypair(provider);
        const ctx = { admin, program, provider, vault, user: new_user, mint, configPda, configBump }
        const userAta = getAta(ctx.user.publicKey, ctx.mint);
        await ctx.program.methods
            .updateConfig(
                new anchor.BN(500_000),
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

});



