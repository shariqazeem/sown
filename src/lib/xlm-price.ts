import "server-only";
import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { baseNetwork, networkName } from "@/lib/stellar/network";
import { simulate } from "@/lib/stellar/soroban";

/**
 * ONE XLM IN DOLLARS, for fee lines only, from Aquarius's mainnet XLM/USDC pool
 * (`CA6PUJLB…CJBE`, XLM at index 0, USDC at 1; read 2026-10-08: 10 XLM → 2.0013 USDC). Never
 * used to settle anything. On testnet, test XLM has no price, so this says so with null.
 */
const POOL = "CA6PUJLBYKZKUEKLZJMKBZLEKP2OTHANDEOWSFF44FTSYLKQPIICCJBE";
const HOLD_MS = 60_000;
const KEY = Symbol.for("sown.xlmUsd");

export async function xlmUsd(): Promise<number | null> {
  if (networkName() !== "mainnet") return null;
  const g = globalThis as unknown as Record<symbol, { at: number; v: number | null } | undefined>;
  const hit = g[KEY];
  if (hit && Date.now() - hit.at < HOLD_MS) return hit.v;
  const r = await simulate(baseNetwork("mainnet"), POOL, "estimate_swap", [nativeToScVal(0, { type: "u32" }), nativeToScVal(1, { type: "u32" }), nativeToScVal(10_000_000n, { type: "u128" })]);
  const v = r.ok && r.value.retval ? Number(scValToNative(r.value.retval) as bigint) / 1e7 : null;
  g[KEY] = { at: Date.now(), v };
  return v;
}

/** A fee in stroops, said kindly: "less than a cent", "about 4 cents". Null without a price. */
export function feeInMoney(stroops: number, usdPerXlm: number | null): string | null {
  if (!usdPerXlm) return null;
  const usd = (stroops / 1e7) * usdPerXlm;
  if (usd < 0.01) return "less than a cent";
  if (usd < 1) return `about ${Math.round(usd * 100)} cents`;
  return `about $${usd.toFixed(2)}`;
}
