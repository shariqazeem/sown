/**
 * TESTNET ONLY: send an envelope from the battery's sender and print its claim link, to try the
 * claim page by hand (Face ID on a phone, or a Stellar wallet).
 *
 *   npx tsx scripts/dev-send.ts [usd] [keepPercent]      # defaults: 5 USD, 10%
 *
 * The link carries a testnet claim secret for test money; it is printed for you to open.
 */
import { keepAssets } from "@/lib/assets/catalogue";
import { deployment } from "@/lib/deployments";
import { claimPath } from "@/lib/envelope/claim";
import { baseNetwork } from "@/lib/stellar/network";
import { keypair } from "./lib/keys";
import { sendFromKey } from "./lib/send-from-key";

async function main() {
  const net = baseNetwork("testnet");
  const d = deployment("testnet");
  if (!d) throw new Error("No testnet deployment.");
  const usd = Number(process.argv[2] ?? 5);
  const keepBps = Math.round(Number(process.argv[3] ?? 10) * 100);
  const sent = await sendFromKey(net, d.contractId, keypair("sown-sender"), keepAssets("testnet")[0]!, usd, keepBps);
  if (!sent.ok) throw new Error(sent.why);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
  console.log(`envelope ${sent.value.id} sent (${sent.value.hash})`);
  console.log(`${site}${claimPath(sent.value.id, sent.value.secret)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
