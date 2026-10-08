import { bps, dateUTC, fromRaw, short, stampUTC, units, unitsExact, usdAligned } from "@/lib/format";
import type { Envelope } from "./types";

/**
 * THE WORDS AN ENVELOPE PRINTS, from its record. Pure, so the receipt, the claim page, the rows
 * and the share card say the same thing about the same envelope, and a test can hold them.
 */
export const MEASURE_AFTER = 30 * 86_400;

export function sentTotal(e: Pick<Envelope, "cash" | "keepIn">): bigint {
  return e.cash + e.keepIn;
}

/** "$1.1348 per USDY": the fill, USDC in over units out. */
export function fillPrice(e: Pick<Envelope, "keepIn" | "keepOut">, ticker: string): string | null {
  if (e.keepOut <= 0n || e.keepIn <= 0n) return null;
  const p = Number(e.keepIn) / Number(e.keepOut);
  return `$${p.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: p < 0.1 ? 6 : 4 })} per ${ticker}`;
}

export type StillHeld = { readonly text: string; readonly tone: "ok" | "muted" };

/** Still held: a date until it is measured, then the units and the share of the keep. */
export function stillHeld(e: Pick<Envelope, "state" | "claimedAt" | "measuredAt" | "measuredBalance" | "keepOut">, ticker: string, nowSeconds: number = Math.floor(Date.now() / 1000)): StillHeld {
  if (e.state !== "claimed") return { text: e.state === "returned" ? "not measured: it went back to the sender" : "measured 30 days after the claim", tone: "muted" };
  if (e.measuredAt > 0) {
    const pct = e.keepOut > 0n ? Number((e.measuredBalance * 10_000n) / e.keepOut) / 100 : 0;
    return { text: `${units(e.measuredBalance)} ${ticker} on ${dateUTC(e.measuredAt)} · ${pct.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`, tone: "ok" };
  }
  const due = e.claimedAt + MEASURE_AFTER;
  return { text: due > nowSeconds ? `to be measured on ${dateUTC(due)}` : `due ${dateUTC(due)}, not measured yet`, tone: "muted" };
}

export function headline(e: Envelope): { kicker: string; tone: "ok" | "waiting" | "returned" } {
  if (e.state === "claimed") return { kicker: "Claimed on Stellar", tone: "ok" };
  if (e.state === "returned") return { kicker: "Returned on Stellar", tone: "returned" };
  return { kicker: "Sent on Stellar, waiting", tone: "waiting" };
}

export function returnWords(e: Pick<Envelope, "state" | "returnAt" | "claimedAt" | "sender">, nowSeconds: number = Math.floor(Date.now() / 1000)): string {
  if (e.state === "returned") return e.claimedAt >= e.returnAt ? `This went back to the sender on ${dateUTC(e.claimedAt)}, unclaimed.` : `The sender took this back on ${dateUTC(e.claimedAt)}.`;
  if (e.state === "open") return e.returnAt > nowSeconds ? `If nobody claims it, it goes back to the sender on ${dateUTC(e.returnAt)}. The sender can take it back before then.` : `Its return date, ${dateUTC(e.returnAt)}, has passed: anyone can send it back to the sender now.`;
  return "";
}

export { bps, fromRaw, short, stampUTC, units, unitsExact, usdAligned };
