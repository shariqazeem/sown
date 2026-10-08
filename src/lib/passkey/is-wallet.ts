import "server-only";
import { KIT } from "@/lib/passkey/config";
import { wasmHashOf } from "@/lib/stellar/code";
import type { NetworkConfig } from "@/lib/stellar/network";

/**
 * Is this C-address a passkey wallet? Read from the ledger: its code is the Smart Account Kit's
 * account wasm. A receipt says "a wallet made with Face ID" only when this is true.
 */
export async function isPasskeyWallet(net: NetworkConfig, address: string | null): Promise<boolean> {
  if (!address || !address.startsWith("C")) return false;
  const hash = await wasmHashOf(net, address);
  return hash.ok && hash.value === KIT[net.name].accountWasmHash;
}
