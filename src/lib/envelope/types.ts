/**
 * THE ENVELOPE, AS THE CONTRACT STORES IT. Amounts are raw units at 7 decimals (bigint);
 * times are unix seconds. Decoded from `scValToNative(get(id))`, which renders a unit enum
 * variant as `["Open"]`, an `Option::None` as null, and BytesN as a Buffer.
 */
export type EnvelopeState = "open" | "claimed" | "returned";

export type Envelope = {
  readonly id: bigint;
  readonly sender: string;
  readonly cash: bigint;
  readonly keepAsset: string;
  readonly keepIn: bigint;
  readonly keepOut: bigint;
  readonly keepBps: number;
  readonly claimKeyHex: string;
  readonly memoHex: string;
  readonly createdAt: number;
  readonly createdLedger: number;
  readonly returnAt: number;
  readonly state: EnvelopeState;
  readonly claimedBy: string | null;
  /** When it was claimed, or returned; 0 while open. */
  readonly claimedAt: number;
  readonly claimedLedger: number;
  /** 0 = not measured. */
  readonly measuredAt: number;
  readonly measuredBalance: bigint;
};

const big = (v: unknown): bigint => {
  if (typeof v === "bigint") return v;
  if (typeof v === "number" && Number.isFinite(v)) return BigInt(Math.trunc(v));
  if (typeof v === "string" && /^-?\d+$/.test(v)) return BigInt(v);
  throw new Error(`not an integer: ${String(v)}`);
};

const num = (v: unknown): number => Number(big(v));

const hex = (v: unknown): string => {
  if (v instanceof Uint8Array) return Buffer.from(v).toString("hex");
  if (typeof v === "string" && /^[0-9a-f]*$/i.test(v)) return v.toLowerCase();
  throw new Error("not bytes");
};

function state(v: unknown): EnvelopeState {
  const tag = Array.isArray(v) ? v[0] : typeof v === "object" && v && "tag" in v ? (v as { tag: string }).tag : v;
  switch (tag) {
    case "Open":
      return "open";
    case "Claimed":
      return "claimed";
    case "Returned":
      return "returned";
    default:
      throw new Error(`unknown state ${String(tag)}`);
  }
}

/** From the contract's native shape to the app's; throws on anything malformed (callers wrap it). */
export function decodeEnvelope(raw: Record<string, unknown>): Envelope {
  return {
    id: big(raw.id),
    sender: String(raw.sender),
    cash: big(raw.cash),
    keepAsset: String(raw.keep_asset),
    keepIn: big(raw.keep_in),
    keepOut: big(raw.keep_out),
    keepBps: num(raw.keep_bps),
    claimKeyHex: hex(raw.claim_key),
    memoHex: hex(raw.memo),
    createdAt: num(raw.created_at),
    createdLedger: num(raw.created_ledger),
    returnAt: num(raw.return_at),
    state: state(raw.state),
    claimedBy: raw.claimed_by === null || raw.claimed_by === undefined ? null : String(raw.claimed_by),
    claimedAt: num(raw.claimed_at),
    claimedLedger: num(raw.claimed_ledger),
    measuredAt: num(raw.measured_at),
    measuredBalance: big(raw.measured_balance),
  };
}

/** The plain JSON form for an API response or a client component (bigint as decimal strings). */
export type EnvelopeJson = { [K in keyof Envelope]: Envelope[K] extends bigint ? string : Envelope[K] };

export function envelopeToJson(e: Envelope): EnvelopeJson {
  return {
    ...e,
    id: e.id.toString(),
    cash: e.cash.toString(),
    keepIn: e.keepIn.toString(),
    keepOut: e.keepOut.toString(),
    measuredBalance: e.measuredBalance.toString(),
  };
}

export function envelopeFromJson(j: EnvelopeJson): Envelope {
  return { ...j, id: BigInt(j.id), cash: BigInt(j.cash), keepIn: BigInt(j.keepIn), keepOut: BigInt(j.keepOut), measuredBalance: BigInt(j.measuredBalance) };
}

/** The contract's error numbers, in the words a person reads. */
export const CONTRACT_ERRORS: Record<number, string> = {
  1: "There is no envelope with that number.",
  2: "This envelope was already claimed or returned.",
  3: "This link does not open this envelope.",
  4: "The keep must be between 0% and 100%.",
  5: "That is less than the least a send can be, or the keep would buy nothing.",
  6: "The return date must be between one day and one year away.",
  7: "That keep asset is not offered right now.",
  8: "Not yet.",
  9: "Only the sender can do that.",
  10: "Still held was already measured for this envelope.",
  11: "That amount is out of range.",
  12: "That pool does not trade this pair.",
  13: "Only a claimed envelope can be measured.",
};
