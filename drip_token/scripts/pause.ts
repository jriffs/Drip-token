/**
 * Convenience wrappers for pause / unpause.
 *
 * These scripts read the current Config, then call update_config
 * with only the paused flag flipped (all other fields preserved).
 *
 * Usage:
 *   ts-node scripts/pause.ts
 *   ts-node scripts/pause.ts --unpause
 */
import { updateConfig } from "../sdk/src/admin";
import { getConfig } from "../sdk/src/config";
import { getProviderAndProgram, parseArgs } from "./_common";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const wantPaused = !args.unpause; // default = pause

  const { provider, program, connection, programId } = getProviderAndProgram();
  const config = await getConfig(connection, program, programId);

  if (config.paused === wantPaused) {
    console.log(
      `Config is already ${wantPaused ? "paused" : "unpaused"}. Nothing to do.`
    );
    return;
  }

  console.log(`${wantPaused ? "Pausing" : "Unpausing"} faucet…`);

  const sig = await updateConfig(
    provider,
    program,
    {
      claimAmount: config.claimAmount,
      cooldownSeconds: config.cooldownSeconds,
      dailyLimit: config.dailyLimit,
      mode: config.mode as 0 | 1,
      paused: wantPaused,
      newAdmin: config.admin,
    },
    programId
  );

  console.log(`Faucet is now ${wantPaused ? "PAUSED" : "ACTIVE"}.`);
  console.log("  signature:", sig);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
