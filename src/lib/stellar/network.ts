import { Networks } from "@stellar/stellar-sdk";

/**
 * THE TWO NETWORKS SOWN RUNS ON, AND WHICH ONE THIS PROCESS SERVES.
 *
 * `NEXT_PUBLIC_SOWN_NETWORK` decides (testnet unless it says mainnet), because the browser
 * needs the same answer as the server: the wallet signs for a passphrase, the passkey wallet
 * simulates against an RPC, and a receipt links to the matching explorer. `SOWN_RPC_URL` (and
 * its public twin for the browser) swaps in a paid endpoint without a code change.
 */
export type NetworkName = "testnet" | "mainnet";

export type NetworkConfig = {
  readonly name: NetworkName;
  readonly passphrase: string;
  readonly rpcUrl: string;
  readonly horizonUrl: string;
  /** stellar.expert, for links a stranger can open. */
  readonly explorer: string;
  readonly friendbot: string | null;
};

const BASE: Record<NetworkName, NetworkConfig> = {
  testnet: {
    name: "testnet",
    passphrase: Networks.TESTNET,
    rpcUrl: "https://soroban-testnet.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
    explorer: "https://stellar.expert/explorer/testnet",
    friendbot: "https://friendbot.stellar.org",
  },
  mainnet: {
    name: "mainnet",
    passphrase: Networks.PUBLIC,
    // SDF runs no public mainnet RPC; this one is listed by Aquarius and answered on 2026-10-08.
    rpcUrl: "https://mainnet.sorobanrpc.com",
    horizonUrl: "https://horizon.stellar.org",
    explorer: "https://stellar.expert/explorer/public",
    friendbot: null,
  },
};

export function networkName(): NetworkName {
  const v = (process.env.NEXT_PUBLIC_SOWN_NETWORK ?? process.env.SOWN_NETWORK ?? "testnet").toLowerCase();
  return v === "mainnet" || v === "public" ? "mainnet" : "testnet";
}

/** A network's endpoints, with any configured override for the RPC. */
export function network(name: NetworkName = networkName()): NetworkConfig {
  const base = BASE[name];
  const override = name === networkName() ? (process.env.SOWN_RPC_URL ?? process.env.NEXT_PUBLIC_SOWN_RPC_URL) : undefined;
  return override ? { ...base, rpcUrl: override } : base;
}

/** The fixed endpoints of a network, ignoring overrides (for scripts that read the other one). */
export function baseNetwork(name: NetworkName): NetworkConfig {
  return BASE[name];
}

export function txUrl(net: NetworkConfig, hash: string): string {
  return `${net.explorer}/tx/${hash}`;
}

export function contractUrl(net: NetworkConfig, id: string): string {
  return `${net.explorer}/contract/${id}`;
}

export function accountUrl(net: NetworkConfig, id: string): string {
  return id.startsWith("C") ? contractUrl(net, id) : `${net.explorer}/account/${id}`;
}
