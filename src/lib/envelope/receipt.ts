import "server-only";
import { Address, FeeBumpTransaction, Operation, TransactionBuilder, rpc, scValToNative } from "@stellar/stellar-sdk";
import { type KeepAssetEntry, keepAssetBySac } from "@/lib/assets/catalogue";
import { cachedTx, recordTx } from "@/lib/db";
import { contractId as deployedContract } from "@/lib/deployments";
import { type Outcome, held, ok } from "@/lib/outcome";
import { gated } from "@/lib/stellar/limiter";
import { type NetworkConfig, network } from "@/lib/stellar/network";
import { rpcServer } from "@/lib/stellar/soroban";
import { type EventTx, eventTx, readEnvelope } from "./read";
import type { Envelope } from "./types";

/**
 * EVERYTHING A RECEIPT PRINTS, FROM THE LEDGER. The envelope is the contract's own record; the
 * transaction hashes come from the contract's events (cached once seen, because RPC forgets
 * events after its retention); "the least it could become" is read from the send transaction's
 * own arguments. Nothing here is computed from a price feed or remembered only by Sown.
 */
export type ReceiptData = {
  readonly envelope: Envelope;
  readonly asset: KeepAssetEntry | null;
  readonly sendTx: EventTx | null;
  readonly claimTx: EventTx | null;
  readonly refundTx: EventTx | null;
  readonly minKeepOut: bigint | null;
  readonly net: NetworkConfig;
  readonly contractId: string;
};

async function txFor(net: NetworkConfig, contract: string, envelopeId: string, kind: "send" | "claim" | "refund", topic: "sent" | "claimed" | "refunded", fromLedger: number): Promise<EventTx | null> {
  const cached = cachedTx(envelopeId, kind, contract);
  if (cached) return cached;
  if (!fromLedger) return null;
  const found = await eventTx(net, contract, topic, BigInt(envelopeId), fromLedger);
  if (found) recordTx(envelopeId, kind, found.hash, found.ledger, found.at, contract);
  return found;
}

/** min_keep_out, the fifth argument of the `send` call, from the transaction itself. */
export async function minKeepOutOf(net: NetworkConfig, hash: string): Promise<bigint | null> {
  try {
    const got = await gated(net.rpcUrl, () => rpcServer(net).getTransaction(hash));
    let envelopeXdr: string | null = null;
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) envelopeXdr = got.envelopeXdr.toXDR("base64");
    if (!envelopeXdr) {
      const res = await gated(net.horizonUrl, () => fetch(`${net.horizonUrl}/transactions/${hash}`, { cache: "no-store", signal: AbortSignal.timeout(8_000) }));
      if (!res.ok) return null;
      envelopeXdr = ((await res.json()) as { envelope_xdr?: string }).envelope_xdr ?? null;
    }
    if (!envelopeXdr) return null;
    let tx = TransactionBuilder.fromXDR(envelopeXdr, net.passphrase);
    if (tx instanceof FeeBumpTransaction) tx = tx.innerTransaction;
    const op = tx.operations[0] as Operation.InvokeHostFunction | undefined;
    if (!op || op.type !== "invokeHostFunction" || op.func.switch().name !== "hostFunctionTypeInvokeContract") return null;
    const call = op.func.invokeContract();
    if (call.functionName().toString() !== "send") return null;
    const arg = call.args()[4];
    return arg ? BigInt(scValToNative(arg) as bigint) : null;
  } catch {
    return null;
  }
}

export async function readReceipt(idText: string): Promise<Outcome<ReceiptData>> {
  if (!/^\d{1,19}$/.test(idText)) return held("That is not an envelope number.");
  const net = network();
  const contract = deployedContract();
  if (!contract) return held(`Sown is not deployed on ${net.name} yet.`);
  const e = await readEnvelope(net, contract, BigInt(idText));
  if (!e.ok) return e;
  const env = e.value;
  const [sendTx, claimTx, refundTx] = await Promise.all([
    txFor(net, contract, idText, "send", "sent", env.createdLedger),
    env.state === "claimed" ? txFor(net, contract, idText, "claim", "claimed", env.claimedLedger) : Promise.resolve(null),
    env.state === "returned" ? txFor(net, contract, idText, "refund", "refunded", env.claimedLedger) : Promise.resolve(null),
  ]);
  const minKeepOut = sendTx && env.keepIn > 0n ? await minKeepOutOf(net, sendTx.hash) : null;
  return ok({ envelope: env, asset: keepAssetBySac(net.name, env.keepAsset), sendTx, claimTx, refundTx, minKeepOut, net, contractId: contract });
}

/** Is this address a contract (a passkey wallet) rather than a classic account? */
export function isContractAddress(a: string | null): boolean {
  if (!a) return false;
  try {
    return Address.fromString(a).toScAddress().switch().name === "scAddressTypeContract";
  } catch {
    return false;
  }
}
