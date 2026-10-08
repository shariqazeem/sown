/**
 * KEEP THE CONTRACT ALIVE — extend the Sown contract's instance and code with an ExtendFootprintTTL
 * operation, paid by whoever runs Sown, never by a sender or a recipient.
 *
 * Why from outside: extending an instance also extends its code, and code rent is charged on its
 * in-memory size. Measured on testnet on 8 October 2026: carrying 15 KB of code to the maximum
 * TTL cost 154.9 XLM there (about 27 XLM at mainnet's rate that day). If any user-facing
 * function did it, the unlucky caller would pay that. Each envelope still extends its own entry.
 *
 *   npx tsx scripts/keep-alive.ts                       # testnet: show what is left, extend to 60 days
 *   npx tsx scripts/keep-alive.ts --days 90 --dry       # show the cost, send nothing
 *   SOWN_ADMIN_SECRET=S… SOWN_MAINNET=yes npx tsx scripts/keep-alive.ts --network mainnet --days 180
 */
import { Address, Keypair, Operation, SorobanDataBuilder, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";
import { deployment } from "@/lib/deployments";
import { gated } from "@/lib/stellar/limiter";
import { type NetworkConfig, type NetworkName, baseNetwork } from "@/lib/stellar/network";
import { rpcServer, sendAndWait } from "@/lib/stellar/soroban";
import { keypair, keypairFromEnv } from "./lib/keys";

const LEDGERS_PER_DAY = 17_280;

export function instanceKey(contractId: string): xdr.LedgerKey {
  return xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({ contract: Address.fromString(contractId).toScAddress(), key: xdr.ScVal.scvLedgerKeyContractInstance(), durability: xdr.ContractDataDurability.persistent() }),
  );
}

/** The instance's and the code's keys, and how many ledgers each has left. */
export async function lifeLeft(net: NetworkConfig, contractId: string) {
  const server = rpcServer(net);
  const latest = (await gated(net.rpcUrl, () => server.getLatestLedger())).sequence;
  const inst = await gated(net.rpcUrl, () => server.getLedgerEntries(instanceKey(contractId)));
  const e = inst.entries[0];
  if (!e) throw new Error("No contract instance at that address (archived, or wrong network).");
  const hash = e.val.contractData().val().instance().executable().wasmHash();
  const codeKey = xdr.LedgerKey.contractCode(new xdr.LedgerKeyContractCode({ hash }));
  const code = (await gated(net.rpcUrl, () => server.getLedgerEntries(codeKey))).entries[0];
  return {
    latest,
    keys: [instanceKey(contractId), codeKey],
    instanceLeft: (e.liveUntilLedgerSeq ?? latest) - latest,
    codeLeft: (code?.liveUntilLedgerSeq ?? latest) - latest,
  };
}

/** Extend the instance and the code to `days` (capped at the network's maximum). Returns the hash, or null when nothing was needed. */
export async function extendContract(net: NetworkConfig, payer: Keypair, contractId: string, days: number, dry = false): Promise<{ hash: string | null; costStroops: number }> {
  const life = await lifeLeft(net, contractId);
  console.log(`${net.name} ${contractId}: instance ${(life.instanceLeft / LEDGERS_PER_DAY).toFixed(1)} days left, code ${(life.codeLeft / LEDGERS_PER_DAY).toFixed(1)} days left`);
  const extendTo = Math.min(days * LEDGERS_PER_DAY, 3_110_400 - 1);
  if (Math.min(life.instanceLeft, life.codeLeft) >= extendTo) {
    console.log(`  both already live ${days} days or more; nothing to do`);
    return { hash: null, costStroops: 0 };
  }
  const server = rpcServer(net);
  const account = await gated(net.rpcUrl, () => server.getAccount(payer.publicKey()));
  const data = new SorobanDataBuilder().setReadOnly(life.keys).build();
  const tx = new TransactionBuilder(account, { fee: "1000000", networkPassphrase: net.passphrase }).setSorobanData(data).addOperation(Operation.extendFootprintTtl({ extendTo })).setTimeout(120).build();
  const sim = await gated(net.rpcUrl, () => server.simulateTransaction(tx));
  if (rpc.Api.isSimulationError(sim)) throw new Error(`simulation failed: ${sim.error.split("\n")[0]}`);
  const cost = Number(sim.minResourceFee);
  console.log(`  extending both to ${days} days costs ${(cost / 1e7).toFixed(4)} XLM, paid by ${payer.publicKey()}`);
  if (dry) return { hash: null, costStroops: cost };
  const assembled = rpc.assembleTransaction(tx, sim).build();
  assembled.sign(payer);
  const landed = await sendAndWait(net, assembled);
  if (!landed.ok) throw new Error(landed.why);
  const after = await lifeLeft(net, contractId);
  console.log(`  extended: ${landed.value.hash}; instance ${(after.instanceLeft / LEDGERS_PER_DAY).toFixed(1)} days, code ${(after.codeLeft / LEDGERS_PER_DAY).toFixed(1)} days`);
  return { hash: landed.value.hash, costStroops: cost };
}

async function main() {
  const arg = (k: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined);
  const which = (arg("--network") ?? "testnet") as NetworkName;
  const days = Number(arg("--days") ?? 60);
  const dry = process.argv.includes("--dry");
  if (which === "mainnet" && !dry && process.env.SOWN_MAINNET !== "yes") throw new Error("Mainnet needs SOWN_MAINNET=yes and SOWN_ADMIN_SECRET.");
  const d = deployment(which);
  if (!d) throw new Error(`Sown is not deployed on ${which}.`);
  const payer: Keypair = which === "mainnet" && !dry ? keypairFromEnv("SOWN_ADMIN_SECRET") : which === "mainnet" ? Keypair.fromPublicKey(d.admin) : keypair("sown-admin");
  await extendContract(baseNetwork(which), payer, d.contractId, days, dry);
}

if (process.argv[1]?.endsWith("keep-alive.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
