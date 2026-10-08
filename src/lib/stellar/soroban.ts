import {
  Account,
  Address,
  Contract,
  FeeBumpTransaction,
  Keypair,
  Operation,
  Transaction,
  TransactionBuilder,
  authorizeEntry,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { type Outcome, held, ok } from "@/lib/outcome";
import { gated } from "./limiter";
import type { NetworkConfig } from "./network";

/**
 * SOROBAN, AS SOWN USES IT: simulate a call, read a view, send a signed transaction and wait
 * for the ledger to say what happened. Every read passes the endpoint's gate. Nothing here
 * throws for an answer the network gave; a refusal is a held value with the network's reason.
 */

/** The SDK's own null source: simulations of reads need no account to exist. */
export const NULL_ACCOUNT = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

/**
 * HEADROOM FOR WHAT A SIMULATION CANNOT SEE. Measured on testnet on 2026-10-08: an Aquarius
 * swap simulated at 3,377,838 instructions spent 3,378,198 on the ledger a few seconds later
 * and failed with "operation instructions exceeds amount specified" (tx 6bc95ada…). The
 * pool's own bookkeeping moves with the ledger. One million extra instructions costs about
 * 2,500 stroops at today's rates, far under a cent; a failed send costs the sender's trust.
 */
export const INSTRUCTION_LEEWAY = 1_000_000;

export function rpcServer(net: NetworkConfig): rpc.Server {
  return new rpc.Server(net.rpcUrl, { allowHttp: net.rpcUrl.startsWith("http://") });
}

export type Simulated = {
  readonly tx: Transaction;
  readonly sim: rpc.Api.SimulateTransactionSuccessResponse;
  readonly retval: xdr.ScVal | undefined;
};

/** Build a one-call transaction from `source` (sequence 0 unless an account is given). */
export function buildCall(
  net: NetworkConfig,
  source: string | Account,
  contractId: string,
  method: string,
  args: readonly xdr.ScVal[],
  opts: { fee?: string; timeoutSeconds?: number } = {},
): Transaction {
  const account = typeof source === "string" ? new Account(source, "0") : source;
  return new TransactionBuilder(account, { fee: opts.fee ?? "1000000", networkPassphrase: net.passphrase })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(opts.timeoutSeconds ?? 300)
    .build();
}

/** Simulate one contract call. Nothing is signed or sent. */
export async function simulate(
  net: NetworkConfig,
  contractId: string,
  method: string,
  args: readonly xdr.ScVal[],
  opts: { source?: string; authMode?: rpc.Api.SimulationAuthMode } = {},
): Promise<Outcome<Simulated>> {
  const tx = buildCall(net, opts.source ?? NULL_ACCOUNT, contractId, method, args);
  const server = rpcServer(net);
  let sim: rpc.Api.SimulateTransactionResponse;
  try {
    sim = await gated(net.rpcUrl, () => server.simulateTransaction(tx, undefined, opts.authMode));
  } catch (err) {
    return held(`The network did not answer a simulation of ${method} (${err instanceof Error ? err.message : String(err)}).`);
  }
  if (rpc.Api.isSimulationError(sim)) return held(simulationReason(sim.error));
  if (rpc.Api.isSimulationRestore(sim)) return held(`Part of the state ${method} reads is archived and must be restored first.`);
  return ok({ tx, sim, retval: sim.result?.retval });
}

/** Read a view and decode it to plain JS values. */
export async function read<T>(net: NetworkConfig, contractId: string, method: string, args: readonly xdr.ScVal[] = []): Promise<Outcome<T>> {
  const s = await simulate(net, contractId, method, args);
  if (!s.ok) return s;
  if (!s.value.retval) return held(`${method} returned nothing.`);
  return ok(scValToNative(s.value.retval) as T);
}

/** Pull the contract's error number out of a simulation's diagnostic text, when there is one. */
export function contractErrorCode(text: string): number | null {
  const m = /Error\(Contract, #(\d+)\)/.exec(text);
  return m ? Number(m[1]) : null;
}

/** A simulation error, shortened to the part a person (or a log) can use. */
export function simulationReason(error: string): string {
  const code = contractErrorCode(error);
  if (code !== null) return `contract error #${code}`;
  const first = error.split("\n").find((l) => l.trim().length > 0) ?? error;
  return first.slice(0, 240);
}

export type Landed = {
  readonly hash: string;
  readonly ledger: number;
  readonly createdAt: number;
  readonly returnValue: xdr.ScVal | undefined;
  readonly feeCharged: string | undefined;
};

/** Submit a signed transaction and wait until the ledger has an answer. */
export async function sendAndWait(net: NetworkConfig, tx: Transaction | FeeBumpTransaction, waitMs = 60_000): Promise<Outcome<Landed>> {
  const server = rpcServer(net);
  const hash = tx.hash().toString("hex");
  let sent: rpc.Api.SendTransactionResponse;
  try {
    sent = await gated(net.rpcUrl, () => server.sendTransaction(tx));
  } catch (err) {
    return held(`The network did not take the transaction (${err instanceof Error ? err.message : String(err)}).`);
  }
  if (sent.status === "ERROR") {
    const code = sent.errorResult?.result().switch().name ?? "rejected";
    return held(`The network refused the transaction (${code}).`);
  }
  if (sent.status === "TRY_AGAIN_LATER") return held("The network is busy and asked to try again in a moment. Nothing moved.");
  return waitFor(net, hash, waitMs);
}

/** Poll a transaction until it lands, fails, or the wait runs out. */
export async function waitFor(net: NetworkConfig, hash: string, waitMs = 60_000): Promise<Outcome<Landed>> {
  const server = rpcServer(net);
  const until = Date.now() + waitMs;
  while (Date.now() < until) {
    let got: rpc.Api.GetTransactionResponse;
    try {
      got = await gated(net.rpcUrl, () => server.getTransaction(hash));
    } catch {
      await sleep(1_500);
      continue;
    }
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      const meta = got.resultMetaXdr;
      let feeCharged: string | undefined;
      try {
        feeCharged = got.resultXdr.feeCharged().toString();
      } catch {
        feeCharged = undefined;
      }
      return ok({ hash, ledger: got.ledger, createdAt: got.createdAt, returnValue: got.returnValue ?? sorobanReturn(meta), feeCharged });
    }
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
      const code = failedReason(got);
      return held(`The transaction failed on the ledger (${code}). Nothing moved.`);
    }
    await sleep(1_200);
  }
  return held("The network has not confirmed the transaction yet. It may still land; check the receipt in a minute.");
}

function sorobanReturn(meta: xdr.TransactionMeta | undefined): xdr.ScVal | undefined {
  try {
    if (!meta) return undefined;
    const sw = meta.switch() as unknown as number;
    if (sw === 4) return meta.v4().sorobanMeta()?.returnValue() ?? undefined;
    if (sw === 3) return meta.v3().sorobanMeta()?.returnValue() ?? undefined;
  } catch {
    return undefined;
  }
  return undefined;
}

function failedReason(got: rpc.Api.GetFailedTransactionResponse): string {
  try {
    const r = got.resultXdr.result();
    const name = r.switch().name;
    const inner = r.results?.()?.[0]?.tr?.();
    if (inner) {
      const op = inner.switch().name;
      const detail = (inner.value() as { switch?: () => { name: string } })?.switch?.()?.name;
      return detail ? `${op}: ${detail}` : op;
    }
    return name;
  } catch {
    return "failed";
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * FOR SCRIPTS AND THE BATTERY: invoke a contract as a keypair. The keypair is the source and
 * pays; any other address that must authorise is signed for by `signers` (by public key).
 */
export async function invokeAs(
  net: NetworkConfig,
  source: Keypair,
  contractId: string,
  method: string,
  args: readonly xdr.ScVal[],
  signers: readonly Keypair[] = [],
): Promise<Outcome<Landed & { sim: rpc.Api.SimulateTransactionSuccessResponse }>> {
  const server = rpcServer(net);
  const account = await gated(net.rpcUrl, () => server.getAccount(source.publicKey()));
  const tx = buildCall(net, account, contractId, method, args, { timeoutSeconds: 120 });
  const sim = await gated(net.rpcUrl, () => server.simulateTransaction(tx, { cpuInstructions: INSTRUCTION_LEEWAY }));
  if (rpc.Api.isSimulationError(sim)) return held(`Simulation of ${method} failed: ${simulationReason(sim.error)}`);
  let assembled = rpc.assembleTransaction(tx, sim).build();
  if (signers.length > 0) {
    const latest = await gated(net.rpcUrl, () => server.getLatestLedger());
    const op = assembled.operations[0] as Operation.InvokeHostFunction;
    const signed: xdr.SorobanAuthorizationEntry[] = [];
    for (const entry of op.auth ?? []) {
      if (entry.credentials().switch().name !== "sorobanCredentialsAddress") {
        signed.push(entry);
        continue;
      }
      const who = Address.fromScAddress(entry.credentials().address().address()).toString();
      const kp = signers.find((k) => k.publicKey() === who);
      signed.push(kp ? await authorizeEntry(entry, kp, latest.sequence + 100, net.passphrase) : entry);
    }
    // The same host function, now carrying signed authorisation entries; re-simulated so the
    // footprint and the fee cover the signature checks.
    const again = TransactionBuilder.cloneFrom(assembled)
      .clearOperations()
      .addOperation(Operation.invokeHostFunction({ func: op.func, auth: signed }))
      .build();
    const sim2 = await gated(net.rpcUrl, () => server.simulateTransaction(again, { cpuInstructions: INSTRUCTION_LEEWAY }));
    if (rpc.Api.isSimulationError(sim2)) return held(`Re-simulation of ${method} failed: ${simulationReason(sim2.error)}`);
    assembled = rpc.assembleTransaction(again, sim2).build();
  }
  assembled.sign(source);
  const landed = await sendAndWait(net, assembled);
  if (!landed.ok) return landed;
  return ok({ ...landed.value, sim });
}
