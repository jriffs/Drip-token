/**
 * Initialize the global Config PDA.
 *
 * Usage:
 *   ts-node scripts/initialize.ts \
 *     --mint <MINT_PUBKEY> \
 *     --claim-amount 1000000 \
 *     --cooldown 60 \
 *     --daily-limit 5000000 \
 *     --mode 0
 *
 * mode: 0 = Mint, 1 = Transfer
 */
import { PublicKey } from "@solana/web3.js";
import { initialize } from "../sdk/src/admin";
import { getConfigPda } from "../sdk/src/pdas";
import { MODE_MINT, MODE_TRANSFER } from "../sdk/src/constants";
import { getProviderAndProgram, parseArgs } from "./_common";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.mint) {
    console.error("Missing required --mint <PUBKEY>");
    process.exit(1);
  }

  const claimAmount = BigInt(args["claim-amount"] || "1000000");
  const cooldownSeconds = BigInt(args.cooldown || "0");
  const dailyLimit = BigInt(args["daily-limit"] || "0");
  const mode = Number(args.mode ?? "0") as 0 | 1;

  if (mode !== MODE_MINT && mode !== MODE_TRANSFER) {
    console.error("--mode must be 0 (Mint) or 1 (Transfer)");
    process.exit(1);
  }

  const { provider, program, programId } = getProviderAndProgram();
  const mint = new PublicKey(args.mint);
  const [configPda] = getConfigPda(programId);

  console.log("Initializing Config…");
  console.log("  programId :", programId.toBase58());
  console.log("  configPda :", configPda.toBase58());
  console.log("  admin     :", provider.wallet.publicKey.toBase58());
  console.log("  mint      :", mint.toBase58());
  console.log("  claim     :", claimAmount.toString());
  console.log("  cooldown  :", cooldownSeconds.toString());
  console.log("  dailyLimit:", dailyLimit.toString());
  console.log("  mode      :", mode === 0 ? "Mint" : "Transfer");

  const sig = await initialize(
    provider,
    program,
    {
      claimAmount,
      cooldownSeconds,
      dailyLimit,
      mint,
      mode,
    },
    programId
  );

  console.log("\nConfig initialized.");
  console.log("  signature :", sig);
  console.log("  configPda :", configPda.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
