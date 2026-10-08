import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Keypair } from "@stellar/stellar-sdk";

/**
 * THIS PROJECT'S TESTNET IDENTITIES, read from `.keys/stellar` through the CLI into memory.
 * A secret is never printed, logged or written anywhere else. Mainnet keys are never here:
 * the mainnet scripts read `SOWN_*_SECRET` from the founder's environment.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
const CLI = join(ROOT, "scripts", "stellar.sh");

export function keypair(alias: string): Keypair {
  const secret = execFileSync(CLI, ["keys", "secret", alias], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  return Keypair.fromSecret(secret);
}

export function address(alias: string): string {
  return execFileSync(CLI, ["keys", "address", alias], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

/** A keypair from an environment variable, for mainnet. Refuses rather than guessing. */
export function keypairFromEnv(name: string): Keypair {
  const secret = process.env[name];
  if (!secret || !secret.startsWith("S")) throw new Error(`Set ${name} to a Stellar secret key (S…). It is read from the environment only.`);
  return Keypair.fromSecret(secret);
}
