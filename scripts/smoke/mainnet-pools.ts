/**
 * DAY-0 SMOKE 3 — THE THREE MAINNET POOLS, READ BY SIMULATION ONLY. Nothing is signed or sent.
 *
 * For each keep asset: the pool's tokens (their order is the index Sown passes), reserves, fee,
 * and estimate_swap(USDC → asset) for 1, 10 and 100 USDC, with the implied price in dollars.
 *
 *   npx tsx scripts/smoke/mainnet-pools.ts
 */
import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { baseNetwork } from "@/lib/stellar/network";
import { read, simulate } from "@/lib/stellar/soroban";

const net = baseNetwork("mainnet");
const USDC = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
const POOLS = [
  { name: "USDY (Ondo)", asset: "CB3YA656OYIHU57657I5KGSBRHE5I3OZU4VFC22PYAOANFZHEWNYGAGP", pool: "CAFHLHGZXOVNCGFJ7DOXL7JDNMBCEZKDI3LS5NRQH3GXC7CSIMQZHUSM" },
  { name: "USTRY (Etherfuse)", asset: "CBLV4ATSIWU67CFSQU2NVRKINQIKUZ2ODSZBUJTJ43VJVRSBTZYOPNUR", pool: "CCX2TYR4AQTPPMTZOIMP3YIBHAYLLSTXVP47PAGTL753PCQFSKV32MIA" },
  { name: "CETES (Etherfuse)", asset: "CAL6ER2TI6CTRAY6BFXWNWA7WTYXUXTQCHUBCIBU5O6KM3HJFG6Z6VXV", pool: "CCKGQSQG5JLZBMYMB4HT6M4H7FUC3NK5C75MIHN6627LRAY5B2SYL2AD" },
];

const u32 = (n: number) => nativeToScVal(n, { type: "u32" });
const u128 = (n: bigint) => nativeToScVal(n, { type: "u128" });
const d7 = (n: bigint) => (Number(n) / 1e7).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 7 });

async function main() {
  const latest = await fetch(net.rpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLatestLedger" }) }).then((r) => r.json());
  console.log(`mainnet, ledger ${latest.result.sequence}, protocol ${latest.result.protocolVersion}, ${new Date().toISOString()}`);
  for (const p of POOLS) {
    const tokens = await read<string[]>(net, p.pool, "get_tokens");
    const reserves = await read<bigint[]>(net, p.pool, "get_reserves");
    const fee = await read<number>(net, p.pool, "get_fee_fraction");
    const kind = await read<string>(net, p.pool, "pool_type");
    if (!tokens.ok || !reserves.ok) {
      console.log(p.name, "unreadable:", tokens.ok ? "" : tokens.why, reserves.ok ? "" : reserves.why);
      continue;
    }
    const inIdx = tokens.value.indexOf(USDC);
    const outIdx = tokens.value.indexOf(p.asset);
    console.log(`\n${p.name} — pool ${p.pool}`);
    console.log(`  type ${kind.ok ? kind.value : "?"}, fee ${fee.ok ? fee.value / 100 : "?"}%, tokens [${tokens.value.map((t, i) => `${i}: ${t === USDC ? "USDC" : t === p.asset ? p.name.split(" ")[0] : t}`).join(", ")}]`);
    console.log(`  reserves ${reserves.value.map((r, i) => `${d7(BigInt(r))} ${tokens.value[i] === USDC ? "USDC" : p.name.split(" ")[0]}`).join(" / ")}`);
    for (const usd of [1n, 10n, 100n]) {
      const inAmount = usd * 10_000_000n;
      const est = await simulate(net, p.pool, "estimate_swap", [u32(inIdx), u32(outIdx), u128(inAmount)]);
      if (!est.ok) {
        console.log(`  ${usd} USDC → ${est.why}`);
        continue;
      }
      const out = BigInt(scValToNative(est.value.retval!));
      const price = Number(inAmount) / Number(out);
      console.log(`  ${String(usd).padStart(3)} USDC → ${d7(out).padStart(14)} ${p.name.split(" ")[0]}   implied $${price.toFixed(6)} each   (in_idx ${inIdx}, out_idx ${outIdx})`);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
