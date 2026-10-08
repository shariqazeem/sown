/**
 * TESTNET ONLY: send an envelope from the battery's sender and print its claim link, to try the
 * claim page by hand (Face ID on a phone, or a Stellar wallet).
 *
 *   npx tsx scripts/dev-send.ts [usd] [keepPercent]      # defaults: 5 USD, 10%
 *
 * The link carries a testnet claim secret for test money; it is printed for you to open.
 */
import { TransactionBuilder, scValToNative } from "@stellar/stellar-sdk";
import { keepAssets } from "@/lib/assets/catalogue";
import { deployment } from "@/lib/deployments";
import { claimKey, claimPath, newSecret } from "@/lib/envelope/claim";
import { quote } from "@/lib/quote";
import { DAY, prepareSend } from "@/lib/send/build";
import { baseNetwork } from "@/lib/stellar/network";
import { sendAndWait } from "@/lib/stellar/soroban";
import { keypair } from "./lib/keys";

async function main() {
  const net = baseNetwork("testnet");
  const d = deployment("testnet");
  if (!d) throw new Error("No testnet deployment.");
  const usd = Number(process.argv[2] ?? 5);
  const keepBps = Math.round(Number(process.argv[3] ?? 10) * 100);
  const sender = keypair("sown-sender");
  const asset = keepAssets("testnet")[0]!;
  const amountRaw = BigInt(Math.round(usd * 1e7));
  const q = await quote(net, asset, amountRaw, keepBps);
  if (!q.ok) throw new Error(q.why);
  const secret = newSecret();
  const prepared = await prepareSend(net, d.contractId, {
    sender: sender.publicKey(),
    amountRaw,
    keepBps,
    keepAsset: asset.sac,
    minKeepOutRaw: BigInt(q.value.minKeepOutRaw),
    claimKeyHex: claimKey(secret).toString("hex"),
    memoHex: "00".repeat(32),
    returnAt: Math.floor(Date.now() / 1000) + 30 * DAY,
  });
  if (!prepared.ok) throw new Error(prepared.why);
  const tx = TransactionBuilder.fromXDR(prepared.value.xdr, net.passphrase);
  tx.sign(sender);
  const landed = await sendAndWait(net, tx);
  if (!landed.ok) throw new Error(landed.why);
  const id = BigInt(scValToNative(landed.value.returnValue!) as bigint);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
  console.log(`envelope ${id} sent (${landed.value.hash})`);
  console.log(`${site}${claimPath(id, secret)}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
