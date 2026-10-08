import { Keypair, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";
import { gated } from "@/lib/stellar/limiter";
import type { NetworkConfig } from "@/lib/stellar/network";
import { INSTRUCTION_LEEWAY, rpcServer, sendAndWait, simulationReason } from "@/lib/stellar/soroban";

/** One Soroban operation from a keypair: simulate with headroom, assemble, sign, send, wait. */
export async function submitOp(net: NetworkConfig, source: Keypair, op: xdr.Operation) {
  const server = rpcServer(net);
  const account = await gated(net.rpcUrl, () => server.getAccount(source.publicKey()));
  const tx = new TransactionBuilder(account, { fee: "1000000", networkPassphrase: net.passphrase }).addOperation(op).setTimeout(120).build();
  const sim = await gated(net.rpcUrl, () => server.simulateTransaction(tx, { cpuInstructions: INSTRUCTION_LEEWAY }));
  if (rpc.Api.isSimulationError(sim)) throw new Error(`simulation failed: ${simulationReason(sim.error)}\n${sim.error.slice(0, 1200)}`);
  const assembled = rpc.assembleTransaction(tx, sim).build();
  assembled.sign(source);
  const landed = await sendAndWait(net, assembled);
  if (!landed.ok) throw new Error(landed.why);
  return landed.value;
}
