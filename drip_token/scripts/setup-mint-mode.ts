/**
 * Mint-mode post-initialize setup.
 * Transfers mint authority of the configured mint to the Config PDA.
 *
 * Prerequisites:
 *   - Config already initialized with mode = 0 (Mint)
 *   - Current wallet is the mint authority of --mint
 *
 * Usage:
 *   ts-node scripts/setup-mint-mode.ts --mint <MINT_PUBKEY>
 *
 * After this script the Config PDA becomes the sole mint authority.
 * Claims will then succeed in Mint mode.
 */
import { PublicKey } from "@solana/web3.js";
import {
  getMint,
  setAuthority,
  AuthorityType,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getConfigPda } from "../sdk/src/pdas";
import { getConfig } from "../sdk/src/config";
import { getProviderAndProgram, parseArgs } from "./_common";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.mint) {
    console.error("Missing required --mint <PUBKEY>");
    process.exit(1);
  }

  const { provider, program, connection, programId, wallet } =
    getProviderAndProgram();
  const mint = new PublicKey(args.mint);
  const [configPda] = getConfigPda(programId);

  // Sanity-check Config
  const config = await getConfig(connection, program, programId);
  if (config.mode !== 0) {
    console.warn(
      "Warning: Config.mode is not Mint (0). Continuing anyway – you may still want the Config PDA as mint authority for mint_to_vault."
    );
  }
  if (!config.mint.equals(mint)) {
    console.error(
      `Mint mismatch. Config.mint=${config.mint.toBase58()}  supplied=${mint.toBase58()}`
    );
    process.exit(1);
  }

  const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_PROGRAM_ID);
  console.log("Current mint authority:", mintInfo.mintAuthority?.toBase58() ?? "(none)");

  if (mintInfo.mintAuthority?.equals(configPda)) {
    console.log("Config PDA is already the mint authority. Nothing to do.");
    return;
  }

  if (!mintInfo.mintAuthority?.equals(wallet.publicKey)) {
    console.error(
      "Current wallet is not the mint authority. Cannot transfer authority."
    );
    process.exit(1);
  }

  console.log("Transferring mint authority → Config PDA…");
  console.log("  mint      :", mint.toBase58());
  console.log("  configPda :", configPda.toBase58());

  const sig = await setAuthority(
    connection,
    wallet,
    mint,
    wallet.publicKey,
    AuthorityType.MintTokens,
    configPda,
    [],
    { commitment: "confirmed" },
    TOKEN_PROGRAM_ID
  );

  console.log("\nMint authority transferred.");
  console.log("  signature :", sig);
  console.log("  new authority:", configPda.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
