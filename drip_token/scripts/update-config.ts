/**
 * Update mutable Config fields (admin-only).
 *
 * All fields are required so the call is explicit and auditable.
 *
 * Usage:
 *   ts-node scripts/update-config.ts \
 *     --claim-amount 1000000 \
 *     --cooldown 120 \
 *     --daily-limit 10000000 \
 *     --mode 0 \
 *     --paused false \
 *     --new-admin <PUBKEY>
 */
import { PublicKey } from "@solana/web3.js";
import { updateConfig } from "../sdk/src/admin";
import { MODE_MINT, MODE_TRANSFER } from "../sdk/src/constants";
import { getProviderAndProgram, parseArgs } from "./_common";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const required = [
    "claim-amount",
    "cooldown",
    "daily-limit",
    "mode",
    "paused",
    "new-admin",
  ];
  for (const k of required) {
    if (args[k] === undefined) {
      console.error(`Missing required --${k}`);
      process.exit(1);
    }
  }

  const mode = Number(args.mode) as 0 | 1;
  if (mode !== MODE_MINT && mode !== MODE_TRANSFER) {
    console.error("--mode must be 0 or 1");
    process.exit(1);
  }

  const paused = args.paused === "true" || args.paused === "1";
  const newAdmin = new PublicKey(args["new-admin"]);

  const { provider, program, programId } = getProviderAndProgram();

  console.log("Updating Config…");
  console.log("  claim_amount    :", args["claim-amount"]);
  console.log("  cooldown_seconds:", args.cooldown);
  console.log("  daily_limit     :", args["daily-limit"]);
  console.log("  mode            :", mode);
  console.log("  paused          :", paused);
  console.log("  new_admin       :", newAdmin.toBase58());

  const sig = await updateConfig(
    provider,
    program,
    {
      claimAmount: BigInt(args["claim-amount"]),
      cooldownSeconds: BigInt(args.cooldown),
      dailyLimit: BigInt(args["daily-limit"]),
      mode,
      paused,
      newAdmin,
    },
    programId
  );

  console.log("\nConfig updated.");
  console.log("  signature:", sig);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
