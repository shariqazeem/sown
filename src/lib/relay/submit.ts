import { Keypair, Operation, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";
import { type Outcome, held, ok } from "@/lib/outcome";
import { gated } from "@/lib/stellar/limiter";
import type { NetworkConfig } from "@/lib/stellar/network";
import { INSTRUCTION_LEEWAY, type Landed, rpcServer, sendAndWait, simulationReason } from "@/lib/stellar/soroban";

/**
 * SOWN'S SERVERS PAY THE NETWORK: one host function and its already-signed authorisation
 * entries, wrapped in a transaction whose source and fee are the sponsor's. This is the
 * Smart Account Kit's `{ func, auth }` relayer shape.
 *
 * It signs whatever it is given, so it must only ever be called after `verify.ts` has said
 * yes to exactly this func and these entries. The sponsor's signature covers the envelope
 * (source, sequence, fee); it authorises nothing inside the call — the entries do that.
 */
export function decodeFuncAuth(funcB64: string, authB64: readonly string[]): Outcome<{ func: xdr.HostFunction; auth: xdr.SorobanAuthorizationEntry[] }> {
  try {
    const func = xdr.HostFunction.fromXDR(funcB64, "base64");
    const auth = authB64.map((a) => xdr.SorobanAuthorizationEntry.fromXDR(a, "base64"));
    return ok({ func, auth });
  } catch {
    return held("The request did not carry a readable Stellar call.");
  }
}

export async function submitFuncAuth(
  net: NetworkConfig,
  sponsor: Keypair,
  func: xdr.HostFunction,
  auth: readonly xdr.SorobanAuthorizationEntry[],
): Promise<Outcome<Landed>> {
  const server = rpcServer(net);
  let account;
  try {
    account = await gated(net.rpcUrl, () => server.getAccount(sponsor.publicKey()));
  } catch {
    return held("Sown's servers could not load their own account. Nothing moved.");
  }
  const tx = new TransactionBuilder(account, { fee: "1000000", networkPassphrase: net.passphrase })
    .addOperation(Operation.invokeHostFunction({ func, auth: [...auth] }))
    .setTimeout(120)
    .build();
  let sim: rpc.Api.SimulateTransactionResponse;
  try {
    sim = await gated(net.rpcUrl, () => server.simulateTransaction(tx, { cpuInstructions: INSTRUCTION_LEEWAY }));
  } catch (err) {
    return held(`The network did not answer (${err instanceof Error ? err.message : String(err)}). Nothing moved.`);
  }
  if (rpc.Api.isSimulationError(sim)) return held(`The network would refuse this call (${simulationReason(sim.error)}). Nothing moved.`);
  const assembled = rpc.assembleTransaction(tx, sim).build();
  assembled.sign(sponsor);
  return sendAndWait(net, assembled);
}
