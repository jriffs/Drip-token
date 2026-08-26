import { Connection } from "@solana/web3.js";

/**
 * Simple promise-based sleep.
 * Used for cooldown / daily-limit tests with short durations
 * (recommended: 2–5 seconds) so tests remain practical.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns an approximate current unix timestamp from the connection.
 */
export async function getCurrentUnixTs(
  connection: Connection
): Promise<number> {
  const slot = await connection.getSlot("confirmed");
  const blockTime = await connection.getBlockTime(slot);
  if (blockTime === null) {
    return Math.floor(Date.now() / 1000);
  }
  return blockTime;
}

/** Matches the on-chain constant */
export const SECONDS_PER_DAY = 86_400;