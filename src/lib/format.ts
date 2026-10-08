/**
 * Display formatters, from Scrip's `format.ts`, at Stellar's 7 decimals. Pure, so a server
 * component and a client leaf render the same string from the same number. Every locale is
 * pinned to en-US: an unpinned locale renders "$1.000" in a European browser and the page
 * fails to hydrate.
 */
export const DECIMALS = 7;
export const ONE = 10_000_000n;

const group = (v: number, min: number, max: number): string => v.toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });

/** USD in prose: whole amounts read clean ($100), fractional ones show cents ($90.50). */
export const usd = (n: number): string => {
  const v = Math.round(n * 100) / 100;
  return `${v < 0 ? "-" : ""}$${group(Math.abs(v), Number.isInteger(v) ? 0 : 2, 2)}`;
};

/** The same amount with the cents always shown, for aligned columns and receipts. */
export const usdAligned = (n: number): string => `${n < 0 ? "-" : ""}$${group(Math.abs(Math.round(n * 100) / 100), 2, 2)}`;

/** Raw 7-decimal units → a JS number (display only, never arithmetic on money). */
export const fromRaw = (raw: bigint | number | string): number => Number(BigInt(raw)) / 1e7;

/** Raw USDC → "$90.00". */
export const usdc = (raw: bigint | number | string): string => usdAligned(fromRaw(raw));

/** Raw USDC → "$90" or "$90.50". */
export const usdcProse = (raw: bigint | number | string): string => usd(fromRaw(raw));

/**
 * UNITS OF THE KEEP — the largest thing on any page they appear on. Four places: 0.0001 USDY is
 * about a hundredth of a cent, and four places is what an envelope can carry. Trailing zeros
 * are kept so a column of units aligns.
 */
export const UNIT_DP = 4;
export const units = (raw: bigint | number | string, dp = UNIT_DP): string => group(fromRaw(raw), dp, dp);

/** All seven places, for the raw-units line of a receipt. */
export const unitsExact = (raw: bigint | number | string): string => {
  const v = BigInt(raw);
  const neg = v < 0n;
  const a = neg ? -v : v;
  return `${neg ? "-" : ""}${(a / ONE).toLocaleString("en-US")}.${(a % ONE).toString().padStart(7, "0")}`;
};

/** Dollars typed by a person → raw 7-decimal units, or null for anything that is not money. */
export function rawFromUsd(text: string | number): bigint | null {
  const s = String(text).trim();
  if (!/^\d{1,9}(\.\d{0,7})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return BigInt(whole!) * ONE + BigInt((frac + "0000000").slice(0, 7));
}

/** Basis points as a percentage: 1000 → "10%", 2550 → "25.5%". */
export const bps = (n: number): string => `${group(n / 100, 0, 2)}%`;

/** "G5X2…K7PQ" for G and C addresses; "a91f…0c4e" for hashes. */
export const short = (a: string, head = 4, tail = 4): string => (a.length > head + tail + 1 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "7 Nov 2026", UTC. */
export const dateUTC = (unixSeconds: number): string => {
  const d = new Date(unixSeconds * 1000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]!} ${d.getUTCFullYear()}`;
};

/** "4 Oct", UTC, for a line that already says the year. */
export const dayMonthUTC = (unixSeconds: number): string => {
  const d = new Date(unixSeconds * 1000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]!}`;
};

/** "4 Oct 2026, 19:02 UTC". Receipts get the whole truth. */
export const stampUTC = (unixSeconds: number): string => {
  const d = new Date(unixSeconds * 1000);
  return `${dateUTC(unixSeconds)}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
};

/** "just now", "3 min ago", "2 h ago", "4 days ago", else a date. */
export const since = (unixSeconds: number, now: number = Date.now()): string => {
  const secs = Math.max(0, Math.floor(now / 1000) - unixSeconds);
  if (secs < 45) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  return dateUTC(unixSeconds);
};

/** "in 30 days", "tomorrow", "today" — for a return date still ahead. */
export const until = (unixSeconds: number, now: number = Date.now()): string => {
  const secs = unixSeconds - Math.floor(now / 1000);
  if (secs <= 0) return "now";
  const days = Math.floor(secs / 86_400);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
};

/** XLM in words for a fee line: "0.2046 XLM". */
export const xlm = (stroops: bigint | number | string): string => `${group(fromRaw(stroops), 0, 4)} XLM`;

export const cap = (s: string): string => (s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : s);
