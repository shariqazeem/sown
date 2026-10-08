/**
 * WHAT A LINK TO THE SEND CARD CARRIES: /?usd=50&keep=1000&asset=usdy (the plan's reminder).
 * Only parameters that are present and in range count; an absent one is not a zero.
 */
export type Prefill = { readonly usd?: number; readonly keepBps?: number; readonly asset?: string };

export function parsePrefill(search: string, assetKeys: readonly string[]): Prefill {
  const p = new URLSearchParams(search);
  const out: { usd?: number; keepBps?: number; asset?: string } = {};
  if (p.has("usd")) {
    const u = Number(p.get("usd"));
    if (Number.isFinite(u) && u >= 1 && u <= 10_000) out.usd = Math.round(u * 100) / 100;
  }
  if (p.has("keep")) {
    const k = Number(p.get("keep"));
    if (Number.isInteger(k) && k >= 0 && k <= 10_000) out.keepBps = k;
  }
  const a = p.get("asset");
  if (a && assetKeys.includes(a)) out.asset = a;
  return out;
}
