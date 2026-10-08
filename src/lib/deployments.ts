import mainnet from "../../deployments/mainnet.json";
import testnet from "../../deployments/testnet.json";
import type { NetworkName } from "@/lib/stellar/network";
import { networkName } from "@/lib/stellar/network";

/**
 * WHERE THE SOWN CONTRACT LIVES, per network: written by `scripts/deploy.ts`, read by every
 * surface. A test holds this, the README and `/proof` to the same id.
 */
export type Deployment = {
  readonly network: NetworkName;
  readonly contractId: string;
  readonly sha256: string;
  readonly wasmHash: string;
  readonly bytes: number;
  readonly admin: string;
  readonly usdc: string;
  readonly assets: ReadonlyArray<{ key: string; sac: string; pool: string; inIdx: number; outIdx: number; tx: string }>;
  readonly uploadTx: string;
  readonly deployTx: string;
  readonly ledger: number;
  readonly deployedAt: string;
};

const RAW: Record<NetworkName, unknown> = { mainnet, testnet };

function isDeployment(v: unknown): v is Deployment {
  return typeof v === "object" && v !== null && typeof (v as { contractId?: unknown }).contractId === "string";
}

/** The deployment on a network, or null while Sown is not deployed there. */
export function deployment(name: NetworkName = networkName()): Deployment | null {
  const d = RAW[name];
  return isDeployment(d) ? d : null;
}

export function contractId(name: NetworkName = networkName()): string | null {
  return deployment(name)?.contractId ?? null;
}
