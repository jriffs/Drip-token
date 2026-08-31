/**
 * Transfer-mode post-initialize setup.
 *
 * 1. Creates (or re-uses) a token account owned by the Config PDA for the mint.
 * 2. Calls set_vault so Config.vault points at it.
 * 3. Optionally funds the vault via mint_to_vault (requires Config PDA to be mint authority).
 *
 * Usage:
 *   ts-node scripts/setup-transfer-mode.ts --mint <MINT> [--fund <AMOUNT>]
 *
 * Notes:
 *   - The vault is an Associated Token Account of the Config PDA.
 *   - For funding via mint_to_vault the Config PDA must already be mint authority
 *     (run setup-mint-mode.ts first if needed).
 *   - You can also fund the vault by a normal transfer from any holder.
 */
import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotent,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { setVault, mintToVault } from "../sdk/src/admin";
import { getConfigPda } from "../sdk/src/pdas";
import { getConfig } from "../sdk/src/config";
import { getProviderAndProgram, parseArgs } from "./_common";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.mint) {
    console.error("Missing required --mint <PUBKEY>");
    process.exit(1);
  }

  const fundAmount = args.fund ? BigInt(args.fund) : 0n;

  const { provider, program, connection, programId, wallet } =
    getProviderAndProgram();
  const mint = new PublicKey(args.mint);
  const [configPda] = getConfigPda(programId);

  const config = await getConfig(connection, program, programId);
  if (!config.mint.equals(mint)) {
    console.error(
      `Mint mismatch. Config.mint=${config.mint.toBase58()}  supplied=${mint.toBase58()}`
    );
    process.exit(1);
  }

  // 1. Create ATA owned by Config PDA (idempotent)
  const vaultAta = getAssociatedTokenAddressSync(
    mint,
    configPda,
    true, // allowOwnerOffCurve – PDA
    TOKEN_2022_PROGRAM_ID
  );

  console.log("Ensuring vault ATA exists…");
  console.log("  vault ATA :", vaultAta.toBase58());

  await createAssociatedTokenAccountIdempotent(
    connection,
    wallet,
    mint,
    configPda,
    { commitment: "confirmed" },
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    true // allowOwnerOffCurve
  );

  // 2. set_vault
  console.log("Calling set_vault…");
  const setSig = await setVault(provider, program, mint, vaultAta, programId);
  console.log("  set_vault signature:", setSig);

  // 3. Optional funding via mint_to_vault
  if (fundAmount > 0n) {
    console.log(`Minting ${fundAmount.toString()} into vault via mint_to_vault…`);
    const mintSig = await mintToVault(
      provider,
      program,
      { amount: fundAmount, mint, vault: vaultAta },
      programId
    );
    console.log("  mint_to_vault signature:", mintSig);
  } else {
    console.log("No --fund amount supplied. Vault is empty – fund it later.");
  }

  console.log("\nTransfer-mode setup complete.");
  console.log("  configPda :", configPda.toBase58());
  console.log("  vault     :", vaultAta.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
