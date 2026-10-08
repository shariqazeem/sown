import { nativeToScVal, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import { type Outcome, attempt, held, ok } from "@/lib/outcome";
import { gated } from "@/lib/stellar/limiter";
import type { NetworkConfig } from "@/lib/stellar/network";
import { contractErrorCode, rpcServer, simulate } from "@/lib/stellar/soroban";
import { CONTRACT_ERRORS, type Envelope, decodeEnvelope } from "./types";

/**
 * AN ENVELOPE, READ FROM THE CONTRACT. A receipt renders from this and a cold RPC with the
 * database empty: `get(id)` is the record; the transaction hashes come from the contract's own
 * events, found from the ledgers the envelope itself names.
 */
export async function readEnvelope(net: NetworkConfig, contractId: string, id: bigint | number): Promise<Outcome<Envelope>> {
  return attempt("this envelope", async () => {
    const s = await simulate(net, contractId, "get", [nativeToScVal(BigInt(id), { type: "u64" })]);
    if (!s.ok) {
      const code = contractErrorCode(s.why) ?? (/#(\d+)/.exec(s.why) ? Number(/#(\d+)/.exec(s.why)![1]) : null);
      if (code === 1) return held(CONTRACT_ERRORS[1]!);
      return s;
    }
    if (!s.value.retval) return held("The contract returned no envelope.");
    return ok(decodeEnvelope(scValToNative(s.value.retval) as Record<string, unknown>));
  });
}

export async function readCount(net: NetworkConfig, contractId: string): Promise<Outcome<number>> {
  return attempt("the envelope count", async () => {
    const s = await simulate(net, contractId, "count", []);
    if (!s.ok) return s;
    return ok(Number(scValToNative(s.value.retval!)));
  });
}

/** Every envelope, newest first. Fine at hundreds; past that the cache answers lists. */
export async function readAll(net: NetworkConfig, contractId: string, limit = 200): Promise<Outcome<Envelope[]>> {
  const count = await readCount(net, contractId);
  if (!count.ok) return count;
  const ids: number[] = [];
  for (let i = count.value - 1; i >= 0 && ids.length < limit; i -= 1) ids.push(i);
  const out = await Promise.all(ids.map((i) => readEnvelope(net, contractId, i)));
  const envelopes: Envelope[] = [];
  for (const r of out) {
    if (!r.ok) return r;
    envelopes.push(r.value);
  }
  return ok(envelopes);
}

export type EventTx = { readonly hash: string; readonly ledger: number; readonly at: number };

/**
 * The transaction that emitted `(topic, id)` on this contract, searched from `fromLedger`.
 * Null when the RPC no longer keeps that ledger's events (history is days, not months); the
 * cache answers then.
 */
export async function eventTx(net: NetworkConfig, contractId: string, topic: "sent" | "claimed" | "refunded" | "measured", id: bigint | number, fromLedger: number): Promise<EventTx | null> {
  const server = rpcServer(net);
  const filter: rpc.Api.EventFilter = {
    type: "contract",
    contractIds: [contractId],
    topics: [[xdr.ScVal.scvSymbol(topic).toXDR("base64"), nativeToScVal(BigInt(id), { type: "u64" }).toXDR("base64")]],
  };
  try {
    const res = await gated(net.rpcUrl, () => server.getEvents({ startLedger: fromLedger, filters: [filter], limit: 5 }));
    const e = res.events[0];
    if (!e) return null;
    return { hash: e.txHash, ledger: e.ledger, at: Math.floor(new Date(e.ledgerClosedAt).getTime() / 1000) };
  } catch {
    return null;
  }
}
