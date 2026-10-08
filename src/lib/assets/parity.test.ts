import { Address, Asset } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { deployment } from "@/lib/deployments";
import { baseNetwork } from "@/lib/stellar/network";
import { read } from "@/lib/stellar/soroban";
import { CATALOGUE, USDC } from "./catalogue";

/**
 * TWO LISTS THAT DRIFT. The catalogue is written by hand; the chain derives each asset's
 * contract from its code and issuer, and the Sown contract holds its own table of pools and
 * indices (`asset(addr)`), set from the catalogue at deploy time. These tests hold all three
 * together: offline against the derivation and the deployment record, and live (SOWN_LIVE=1)
 * against the contract itself.
 */
const NETS = ["mainnet", "testnet"] as const;

describe("every asset contract is the one its code and issuer derive", () => {
  for (const net of NETS) {
    it(net, () => {
      const passphrase = baseNetwork(net).passphrase;
      for (const a of CATALOGUE[net]) {
        const asset = a.issuer ? new Asset(a.code, a.issuer) : Asset.native();
        expect(asset.contractId(passphrase), a.key).toBe(a.sac);
      }
      expect(new Asset(USDC[net].code, USDC[net].issuer).contractId(passphrase), "USDC").toBe(USDC[net].sac);
    });
  }
});

const row = (a: { key: string; sac: string; pool: string; inIdx: number; outIdx: number }) => ({ key: a.key, sac: a.sac, pool: a.pool, inIdx: a.inIdx, outIdx: a.outIdx });
const byKey = (x: { key: string }, y: { key: string }) => x.key.localeCompare(y.key);

describe("the deployment record holds the catalogue's assets, pools and indices", () => {
  for (const net of NETS) {
    const d = deployment(net);
    it.skipIf(!d)(net, () => {
      expect(d!.assets.map(row).sort(byKey)).toEqual(CATALOGUE[net].map(row).sort(byKey));
      expect(d!.usdc).toBe(USDC[net].sac);
    });
  }
});

describe.skipIf(process.env.SOWN_LIVE !== "1")("the contract on the ledger holds the catalogue's assets (live)", () => {
  for (const net of NETS) {
    const d = deployment(net);
    it.skipIf(!d)(
      net,
      async () => {
        const n = baseNetwork(net);
        for (const a of CATALOGUE[net]) {
          const got = await read<{ pool: string; in_idx: number; out_idx: number; enabled: boolean }>(n, d!.contractId, "asset", [Address.fromString(a.sac).toScVal()]);
          expect(got.ok, `${a.key}: ${got.ok ? "" : got.why}`).toBe(true);
          if (!got.ok) continue;
          expect({ pool: got.value.pool, inIdx: Number(got.value.in_idx), outIdx: Number(got.value.out_idx), enabled: got.value.enabled }, a.key).toEqual({ pool: a.pool, inIdx: a.inIdx, outIdx: a.outIdx, enabled: true });
        }
        const cfg = await read<{ usdc: string }>(n, d!.contractId, "config");
        expect(cfg.ok && cfg.value.usdc).toBe(USDC[net].sac);
      },
      60_000,
    );
  }
});
