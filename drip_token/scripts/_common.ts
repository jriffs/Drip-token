/**
 * Shared helpers for operational scripts.
 * Run from the project root (drip_token/).
 */
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { DEFAULT_PROGRAM_ID } from "../sdk/src/constants";

export function getCluster(): string {
  return process.env.CLUSTER || "devnet";
}

export function getRpcUrl(): string {
  if (process.env.RPC_URL) return process.env.RPC_URL;
  const cluster = getCluster();
  if (cluster === "localnet" || cluster === "localhost") {
    return "http://127.0.0.1:8899";
  }
  return clusterApiUrl(cluster as anchor.web3.Cluster);
}

export function loadWallet(): Keypair {
  const walletPath =
    process.env.ANCHOR_WALLET ||
    path.join(process.env.HOME || "~", ".config/solana/id.json");
  const raw = fs.readFileSync(walletPath, "utf-8");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

export function getProgramId(): PublicKey {
  if (process.env.PROGRAM_ID) {
    return new PublicKey(process.env.PROGRAM_ID);
  }
  return DEFAULT_PROGRAM_ID;
}

/**
 * Create an Anchor provider + Program instance pointed at the target cluster.
 * Expects the IDL at target/idl/drip_token.json (produced by `anchor build`).
 */
export function getProviderAndProgram() {
  const connection = new Connection(getRpcUrl(), "confirmed");
  const wallet = new anchor.Wallet(loadWallet());
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  const idlPath = path.join(__dirname, "..", "target", "idl", "drip_token.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(
      `IDL not found at ${idlPath}. Run \`anchor build\` first.`
    );
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const programId = getProgramId();
  const program = new anchor.Program(idl, provider);

  return { provider, program, connection, programId, wallet: wallet.payer };
}

export function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out[key] = val;
    }
  }
  return out;
}
