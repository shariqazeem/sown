/**
 * STILL HELD — call measure(id) on every claimed envelope that is 30 days past its claim and not
 * yet measured. Anyone may call it; the contract reads the keep's balance in the claiming wallet
 * itself and writes it into the envelope, once. Run by cron; never mentioned on a surface.
 *
 *   npm run measure                      # testnet, paid by .keys/sown-admin
 *   npm run measure -- --dry             # list what is due, send nothing
 *   SOWN_MEASURER_SECRET=S… SOWN_MAINNET=yes npm run measure -- --network mainnet
 */
import { Keypair, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { deployment } from "@/lib/deployments";
import { readAll } from "@/lib/envelope/read";
import { MEASURE_AFTER } from "@/lib/envelope/view";
import { dateUTC, units } from "@/lib/format";
import { type NetworkName, baseNetwork } from "@/lib/stellar/network";
import { invokeAs } from "@/lib/stellar/soroban";
import { keypair, keypairFromEnv } from "./lib/keys";

async function main() {
  const which = (process.argv.includes("--network") ? process.argv[process.argv.indexOf("--network") + 1] : "testnet") as NetworkName;
  const dry = process.argv.includes("--dry");
  if (which === "mainnet" && !dry && process.env.SOWN_MAINNET !== "yes") throw new Error("Mainnet measurements need SOWN_MAINNET=yes and SOWN_MEASURER_SECRET.");
  const net = baseNetwork(which);
  const d = deployment(which);
  if (!d) throw new Error(`Sown is not deployed on ${which}.`);
  const all = await readAll(net, d.contractId, 1_000);
  if (!all.ok) throw new Error(all.why);
  const now = Math.floor(Date.now() / 1000);
  const claimed = all.value.filter((e) => e.state === "claimed" && e.measuredAt === 0);
  const due = claimed.filter((e) => now >= e.claimedAt + MEASURE_AFTER);
  console.log(`${which}: ${all.value.length} envelopes, ${claimed.length} claimed and unmeasured, ${due.length} due now`);
  for (const e of claimed.filter((x) => !due.includes(x)).slice(0, 5)) console.log(`  envelope ${e.id}: due ${dateUTC(e.claimedAt + MEASURE_AFTER)}`);
  if (dry || due.length === 0) return;
  const payer: Keypair = which === "mainnet" ? keypairFromEnv("SOWN_MEASURER_SECRET") : keypair("sown-admin");
  for (const e of due) {
    const r = await invokeAs(net, payer, d.contractId, "measure", [nativeToScVal(e.id, { type: "u64" })]);
    if (!r.ok) {
      console.log(`  envelope ${e.id}: not measured (${r.why})`);
      continue;
    }
    const balance = r.value.returnValue ? BigInt(scValToNative(r.value.returnValue) as bigint) : null;
    const pct = balance !== null && e.keepOut > 0n ? Number((balance * 10_000n) / e.keepOut) / 100 : null;
    console.log(`  envelope ${e.id}: ${balance === null ? "?" : units(balance)} still held${pct === null ? "" : ` (${pct}% of ${units(e.keepOut)})`}, ${r.value.hash}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
