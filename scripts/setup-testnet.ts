/**
 * A FRESH CHECKOUT ON TESTNET, IN ONE COMMAND: writes .env.local from .env.example with a new
 * testnet key for Sown's servers, funded by Friendbot, and the test wallet switched on so a send
 * can be tried without installing a wallet. The secret is written to .env.local only (mode 600,
 * ignored by git) and never printed.
 *
 *   npm run setup:testnet            # leaves an existing .env.local alone (--force replaces it)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Keypair } from "@stellar/stellar-sdk";
import { ROOT } from "./lib/keys";

async function main() {
  const out = join(ROOT, ".env.local");
  if (existsSync(out) && !process.argv.includes("--force")) {
    console.log(".env.local already exists; leaving it alone (--force replaces it).");
    return;
  }
  const servers = Keypair.random();
  const res = await fetch(`https://friendbot.stellar.org/?addr=${servers.publicKey()}`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Friendbot answered ${res.status}; try again in a minute.`);
  const env = readFileSync(join(ROOT, ".env.example"), "utf8")
    .replace(/^NEXT_PUBLIC_SOWN_NETWORK=.*$/m, "NEXT_PUBLIC_SOWN_NETWORK=testnet")
    .replace(/^SOWN_SPONSOR_SECRET=.*$/m, `SOWN_SPONSOR_SECRET=${servers.secret()}`)
    .replace(/^# NEXT_PUBLIC_SOWN_TEST_WALLET=1$/m, "NEXT_PUBLIC_SOWN_TEST_WALLET=1");
  writeFileSync(out, env, { mode: 0o600 });
  console.log(`wrote .env.local: testnet; Sown's servers pay from ${servers.publicKey()} (funded by Friendbot); the test wallet is on.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
