import { createHash } from "node:crypto";
import { Address, xdr } from "@stellar/stellar-sdk";
import { type Outcome, held, ok } from "@/lib/outcome";
import { gated } from "./limiter";
import type { NetworkConfig } from "./network";
import { rpcServer } from "./soroban";

/**
 * THE CONTRACT'S CODE, DUMPED BACK FROM THE LEDGER. The instance names a wasm hash; the code
 * entry holds the bytes; their sha256 is what /proof prints beside the one built from this
 * repository. Nobody has to trust the hash on the page: the command to reproduce it is there.
 */
export type OnChainCode = { readonly wasmHash: string; readonly sha256: string; readonly bytes: number; readonly liveUntilLedger?: number };

export async function codeOf(net: NetworkConfig, contractId: string): Promise<Outcome<OnChainCode>> {
  const server = rpcServer(net);
  const instanceKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: Address.fromString(contractId).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent(),
    }),
  );
  let inst;
  try {
    inst = await gated(net.rpcUrl, () => server.getLedgerEntries(instanceKey));
  } catch (err) {
    return held(`Could not read the contract instance (${err instanceof Error ? err.message : String(err)}).`);
  }
  const entry = inst.entries[0];
  if (!entry) return held("No contract instance at that address.");
  const exec = entry.val.contractData().val().instance().executable();
  if (exec.switch().name !== "contractExecutableWasm") return held("That contract is not a wasm contract.");
  const wasmHash = Buffer.from(exec.wasmHash()).toString("hex");
  const codeKey = xdr.LedgerKey.contractCode(new xdr.LedgerKeyContractCode({ hash: Buffer.from(wasmHash, "hex") }));
  let code;
  try {
    code = await gated(net.rpcUrl, () => server.getLedgerEntries(codeKey));
  } catch (err) {
    return held(`Could not read the contract code (${err instanceof Error ? err.message : String(err)}).`);
  }
  const c = code.entries[0];
  if (!c) return held("The contract's code entry is archived or missing.");
  const bytes = Buffer.from(c.val.contractCode().code());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return ok({ wasmHash, sha256, bytes: bytes.length, liveUntilLedger: c.liveUntilLedgerSeq });
}
