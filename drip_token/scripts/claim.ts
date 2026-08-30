/**
 * Perform a single claim (smoke-test helper).
 *
 * Usage:
 *   ts-node scripts/claim.ts
 *   ts-node scripts/claim.ts --user <PUBKEY>   # only if the wallet can sign for that user
 */
import { PublicKey } from "@solana/web3.js";
import { claim } from "../sdk/src/claim";
import { getProviderAndProgram, parseArgs } from "./_common";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { provider, program, programId } = getProviderAndProgram();

  const user = args.user
    ? new PublicKey(args.user)
    : provider.wallet.publicKey;

  console.log("Claiming as", user.toBase58(), "…");

  const result = await claim(provider, program, user, programId);

  console.log("\nClaim succeeded.");
  console.log("  signature :", result.signature);
  console.log("  amount    :", result.amount.toString());
  console.log("  mode      :", result.mode === 0 ? "Mint" : "Transfer");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
