/**
 * Fetch and print Config (+ optional UserState) for a quick health check.
 *
 * Usage:
 *   ts-node scripts/health-check.ts
 *   ts-node scripts/health-check.ts --user <PUBKEY>
 */
import { PublicKey } from "@solana/web3.js";
import { getConfig } from "../sdk/src/config";
import { getUserState } from "../sdk/src/user";
import { getConfigPda } from "../sdk/src/pdas";
import { getProviderAndProgram, parseArgs } from "./_common";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { connection, program, programId } = getProviderAndProgram();
  const [configPda] = getConfigPda(programId);

  console.log("Cluster program ID:", programId.toBase58());
  console.log("Config PDA       :", configPda.toBase58());
  console.log("");

  const config = await getConfig(connection, program, programId);

  console.log("=== Config ===");
  console.log("  admin           :", config.admin.toBase58());
  console.log("  mint            :", config.mint.toBase58());
  console.log("  vault           :", config.vault.toBase58());
  console.log("  claim_amount    :", config.claimAmount.toString());
  console.log("  cooldown_seconds:", config.cooldownSeconds.toString());
  console.log("  daily_limit     :", config.dailyLimit.toString());
  console.log("  mode            :", config.mode === 0 ? "Mint (0)" : "Transfer (1)");
  console.log("  paused          :", config.paused);
  console.log("  bump            :", config.bump);

  if (args.user) {
    const user = new PublicKey(args.user);
    const userState = await getUserState(connection, program, user, programId);
    console.log("\n=== UserState ===");
    console.log("  user            :", user.toBase58());
    if (!userState) {
      console.log("  (no UserState account – user has never claimed)");
    } else {
      console.log("  last_claim_ts   :", userState.lastClaimTs.toString());
      console.log("  claimed_today   :", userState.claimedToday.toString());
      console.log("  last_day_ts     :", userState.lastDayTs.toString());
      console.log("  bump            :", userState.bump);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
