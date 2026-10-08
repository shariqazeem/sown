import { Address, FeeBumpTransaction, Operation, StrKey, Transaction, TransactionBuilder, nativeToScVal, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import { type Outcome, held, ok } from "@/lib/outcome";
import { gated } from "@/lib/stellar/limiter";
import type { NetworkConfig } from "@/lib/stellar/network";
import { INSTRUCTION_LEEWAY, rpcServer, simulationReason } from "@/lib/stellar/soroban";
import { CONTRACT_ERRORS } from "@/lib/envelope/types";

/**
 * THE SEND, BUILT FOR ONE SIGNATURE. The sender's own account is the transaction's source, so
 * the wallet's one signature authorises the whole tree: send → USDC.transfer(sender, Sown,
 * amount). The pool's pull of the slice is authorised by the contract itself. Simulated here
 * at the current ledger, with instruction headroom, and handed back as XDR for the wallet.
 */
export type SendArgs = {
  readonly sender: string;
  readonly amountRaw: bigint;
  readonly keepBps: number;
  readonly keepAsset: string;
  readonly minKeepOutRaw: bigint;
  readonly claimKeyHex: string;
  readonly memoHex: string;
  readonly returnAt: number;
};

export const DAY = 86_400;
export const DEFAULT_RETURN_DAYS = 30;

/** The return date, with room on both sides for the minutes between preparing and landing. */
export function returnAtFor(days: number, nowSeconds: number): number {
  const at = nowSeconds + days * DAY;
  return Math.min(Math.max(at, nowSeconds + DAY + 900), nowSeconds + 365 * DAY - 900);
}

export function sendArgs(a: SendArgs): xdr.ScVal[] {
  return [
    Address.fromString(a.sender).toScVal(),
    nativeToScVal(a.amountRaw, { type: "i128" }),
    nativeToScVal(a.keepBps, { type: "u32" }),
    Address.fromString(a.keepAsset).toScVal(),
    nativeToScVal(a.minKeepOutRaw, { type: "i128" }),
    xdr.ScVal.scvBytes(Buffer.from(a.claimKeyHex, "hex")),
    xdr.ScVal.scvBytes(Buffer.from(a.memoHex, "hex")),
    nativeToScVal(BigInt(a.returnAt), { type: "u64" }),
  ];
}

export function validateSend(a: SendArgs): Outcome<SendArgs> {
  if (!StrKey.isValidEd25519PublicKey(a.sender)) return held("Connect a Stellar wallet to send from.");
  if (a.amountRaw < 10_000_000n) return held("The least a send can be is $1.");
  if (!Number.isInteger(a.keepBps) || a.keepBps < 0 || a.keepBps > 10_000) return held("The keep must be between 0% and 100%.");
  if (!/^[0-9a-f]{64}$/.test(a.claimKeyHex)) return held("The link's key is missing. Start the send again.");
  if (!/^[0-9a-f]{64}$/.test(a.memoHex)) return held("The note could not be encoded.");
  if (a.minKeepOutRaw < 0n) return held("The least the keep can become is out of range.");
  return ok(a);
}

export type Prepared = { readonly xdr: string; readonly feeStroops: string; readonly minResourceFee: string; readonly ledger: number };

export async function prepareSend(net: NetworkConfig, contractId: string, a: SendArgs): Promise<Outcome<Prepared>> {
  const v = validateSend(a);
  if (!v.ok) return v;
  const server = rpcServer(net);
  let account;
  try {
    account = await gated(net.rpcUrl, () => server.getAccount(a.sender));
  } catch {
    return held("This wallet has no account on the network yet. Add XLM and USDC to it first.");
  }
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: net.passphrase })
    .addOperation(Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeInvokeContract(new xdr.InvokeContractArgs({ contractAddress: Address.fromString(contractId).toScAddress(), functionName: "send", args: sendArgs(a) })),
      auth: [],
    }))
    .setTimeout(300)
    .build();
  let sim: rpc.Api.SimulateTransactionResponse;
  try {
    sim = await gated(net.rpcUrl, () => server.simulateTransaction(tx, { cpuInstructions: INSTRUCTION_LEEWAY }));
  } catch (err) {
    return held(`The network did not answer (${err instanceof Error ? err.message : String(err)}). Nothing moved.`);
  }
  if (rpc.Api.isSimulationError(sim)) return held(explainSendFailure(sim.error));
  const assembled = rpc.assembleTransaction(tx, sim).build();
  return ok({ xdr: assembled.toXDR(), feeStroops: assembled.fee, minResourceFee: sim.minResourceFee, ledger: sim.latestLedger });
}

/** A simulation's failure, in the sentence the confirm sheet shows. */
export function explainSendFailure(error: string): string {
  const code = /Error\(Contract, #(\d+)\)/.exec(error)?.[1];
  if (code && CONTRACT_ERRORS[Number(code)]) return `${CONTRACT_ERRORS[Number(code)]} Nothing moved.`;
  if (/balance|insufficient|underfunded|#10\b|trustline|NotAuthorized|trust line entry is missing/i.test(error)) return "This wallet does not hold enough USDC for this send. Nothing moved.";
  if (/short fill|out_min|slippage|InsufficientOutput|#2006|#2004/i.test(error)) return "The price on Aquarius moved more than 1% while you were deciding. Nothing moved; ask for a new price.";
  return `The network would refuse this send (${simulationReason(error)}). Nothing moved.`;
}

/** Is a signed transaction exactly one `send` on this contract, from its own source? */
export function inspectSignedSend(passphrase: string, signedXdr: string, contractId: string): Outcome<{ tx: Transaction; sender: string; args: Record<string, unknown> }> {
  let parsed: Transaction | FeeBumpTransaction;
  try {
    parsed = TransactionBuilder.fromXDR(signedXdr, passphrase);
  } catch {
    return held("That is not a signed transaction.");
  }
  if (parsed instanceof FeeBumpTransaction) return held("A send is not wrapped in a fee bump.");
  const tx = parsed;
  if (tx.operations.length !== 1 || tx.operations[0]!.type !== "invokeHostFunction") return held("That is not a send.");
  const op = tx.operations[0] as Operation.InvokeHostFunction;
  if (op.func.switch().name !== "hostFunctionTypeInvokeContract") return held("That is not a send.");
  const call = op.func.invokeContract();
  if (Address.fromScAddress(call.contractAddress()).toString() !== contractId || call.functionName().toString() !== "send") return held("That is not a send to the Sown contract.");
  const args = call.args();
  if (args.length !== 8) return held("That send is malformed.");
  const sender = Address.fromScAddress(args[0]!.address()).toString();
  if (sender !== tx.source) return held("A send must come from the wallet that signs it.");
  if (tx.signatures.length === 0) return held("That send is not signed.");
  return ok({ tx, sender, args: { amount: scValToNative(args[1]!), keepBps: scValToNative(args[2]!), keepAsset: scValToNative(args[3]!) } });
}
