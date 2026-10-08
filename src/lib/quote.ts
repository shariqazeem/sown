import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import type { KeepAssetEntry } from "@/lib/assets/catalogue";
import { type Outcome, held, ok } from "@/lib/outcome";
import type { NetworkConfig } from "@/lib/stellar/network";
import { simulate } from "@/lib/stellar/soroban";

/**
 * WHAT THE SLICE BECOMES, ASKED OF THE POOL ITSELF. `estimate_swap` by simulation at the
 * current ledger; nothing is interpolated, cached past a few seconds, or drawn from a price
 * feed. The least it can become is the estimate less the sender's tolerance, floored, and the
 * contract refuses the whole send below it.
 */
export const DEFAULT_TOLERANCE_BPS = 100; // 1%
export const BPS = 10_000n;

/** keep_in for an amount and a rate, exactly as the contract computes it. */
export function keepIn(amountRaw: bigint, keepBps: number): bigint {
  if (amountRaw < 0n || keepBps < 0 || keepBps > 10_000 || !Number.isInteger(keepBps)) throw new Error("out of range");
  return (amountRaw * BigInt(keepBps)) / BPS;
}

export function cash(amountRaw: bigint, keepBps: number): bigint {
  return amountRaw - keepIn(amountRaw, keepBps);
}

/** The least the slice may become: estimate × (1 − tolerance), floored. */
export function minOut(estimateRaw: bigint, toleranceBps: number = DEFAULT_TOLERANCE_BPS): bigint {
  if (estimateRaw < 0n || toleranceBps < 0 || toleranceBps >= 10_000) throw new Error("out of range");
  return (estimateRaw * (BPS - BigInt(toleranceBps))) / BPS;
}

/** Dollars per unit implied by a fill: USDC in over units out (both 7 decimals). */
export function impliedPrice(inRaw: bigint, outRaw: bigint): number | null {
  if (outRaw <= 0n) return null;
  return Number(inRaw) / Number(outRaw);
}

export type Quote = {
  readonly asset: string;
  readonly amountRaw: string;
  readonly keepBps: number;
  readonly keepInRaw: string;
  readonly cashRaw: string;
  readonly keepOutRaw: string;
  readonly minKeepOutRaw: string;
  readonly toleranceBps: number;
  /** Dollars per unit of the keep asset at this estimate. */
  readonly price: number | null;
  readonly poolFeeBps: number;
  readonly ledger: number;
  readonly at: number;
};

export async function quote(net: NetworkConfig, asset: KeepAssetEntry, amountRaw: bigint, keepBps: number, toleranceBps: number = DEFAULT_TOLERANCE_BPS): Promise<Outcome<Quote>> {
  let k: bigint;
  try {
    k = keepIn(amountRaw, keepBps);
  } catch {
    return held("That keep is out of range.");
  }
  const base = {
    asset: asset.sac,
    amountRaw: amountRaw.toString(),
    keepBps,
    keepInRaw: k.toString(),
    cashRaw: (amountRaw - k).toString(),
    toleranceBps,
    poolFeeBps: asset.poolFeeBps,
    at: Math.floor(Date.now() / 1000),
  };
  if (k === 0n) return ok({ ...base, keepOutRaw: "0", minKeepOutRaw: "0", price: null, ledger: 0 });
  const s = await simulate(net, asset.pool, "estimate_swap", [nativeToScVal(asset.inIdx, { type: "u32" }), nativeToScVal(asset.outIdx, { type: "u32" }), nativeToScVal(k, { type: "u128" })]);
  if (!s.ok || !s.value.retval) return held("Aquarius did not answer. Try again in a moment.");
  const est = BigInt(scValToNative(s.value.retval) as bigint);
  if (est <= 0n) return held("That keep is too small for the pool to fill.");
  return ok({ ...base, keepOutRaw: est.toString(), minKeepOutRaw: minOut(est, toleranceBps).toString(), price: impliedPrice(k, est), ledger: s.value.sim.latestLedger });
}
