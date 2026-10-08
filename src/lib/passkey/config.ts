import type { NetworkName } from "@/lib/stellar/network";

/**
 * THE SMART ACCOUNT KIT'S DEPLOYMENTS (Protocol 27, 2026-07-09; docs/RESEARCH.md §6), which a
 * recipient's wallet is made from, and which the relay accepts and nothing else. The account
 * wasm is the same on both networks; the verifier is not.
 */
export type KitConfig = {
  readonly accountWasmHash: string;
  readonly webauthnVerifier: string;
  /** The kit's shared, sign-only deployer: it salts the wallet's address and never pays. */
  readonly deployer: string;
};

export const KIT: Record<NetworkName, KitConfig> = {
  testnet: {
    accountWasmHash: "1b5f4534a76322da2ad7c745f6900857a6802b0ca79850c35a03561df997785a",
    webauthnVerifier: "CC7EKIHQP3TN4CARQDND6CEOY2UXLWWC2X5GHTD5NLAT7BG5GPZIOM3F",
    deployer: "GAAH4OT36RRCCAGKARGPN2HLHT2NOBVFHO4GUHA6CF7UKQ4MMV24WQ4N",
  },
  mainnet: {
    accountWasmHash: "1b5f4534a76322da2ad7c745f6900857a6802b0ca79850c35a03561df997785a",
    webauthnVerifier: "CB7HENHJ7NF34I5FFXQK7D5I3WWQRGB5O5XO77D3NXMT7LM7LOKRQ5YR",
    deployer: "GAAH4OT36RRCCAGKARGPN2HLHT2NOBVFHO4GUHA6CF7UKQ4MMV24WQ4N",
  },
};
