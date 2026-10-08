import "server-only";
import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { type KeepAssetEntry, USDC, keepAssets } from "@/lib/assets/catalogue";
import { issuerFlags } from "@/lib/assets/issuer-flags";
import { type IssuerFlags, disclosure, flagChips } from "@/lib/assets/disclosure";
import { type NetworkName, baseNetwork, network } from "@/lib/stellar/network";
import { read, simulate } from "@/lib/stellar/soroban";

/**
 * AN ASSET ROW, READ NOW: the issuer's flags from its account, the pool's reserves and what one
 * USDC buys in it, all from the network the row belongs to. A row that could not be read says
 * so; it never borrows a figure from another day.
 */
export type AssetRowData = {
  readonly asset: KeepAssetEntry;
  readonly flags: IssuerFlags | null;
  readonly chips: string[];
  readonly sentence: string;
  /** [USDC, asset] in raw units, from the pool's get_reserves. */
  readonly reserves: readonly [bigint, bigint] | null;
  /** Units one USDC buys on the pool right now. */
  readonly perUsdcRaw: bigint | null;
  readonly readAt: number;
};

export async function assetRow(name: NetworkName, a: KeepAssetEntry): Promise<AssetRowData> {
  const net = name === network().name ? network() : baseNetwork(name);
  const [flags, reserves, est] = await Promise.all([
    issuerFlags(net, a.issuer),
    read<bigint[]>(net, a.pool, "get_reserves"),
    simulate(net, a.pool, "estimate_swap", [nativeToScVal(a.inIdx, { type: "u32" }), nativeToScVal(a.outIdx, { type: "u32" }), nativeToScVal(10_000_000n, { type: "u128" })]),
  ]);
  const r = reserves.ok && reserves.value.length >= 2 ? ([BigInt(reserves.value[a.inIdx]!), BigInt(reserves.value[a.outIdx]!)] as const) : null;
  return {
    asset: a,
    flags,
    chips: flagChips(flags, !!a.issuer),
    sentence: disclosure(a, flags),
    reserves: r,
    perUsdcRaw: est.ok && est.value.retval ? BigInt(scValToNative(est.value.retval) as bigint) : null,
    readAt: Math.floor(Date.now() / 1000),
  };
}

export async function assetRows(name: NetworkName): Promise<AssetRowData[]> {
  return Promise.all(keepAssets(name).map((a) => assetRow(name, a)));
}

export function usdcFor(name: NetworkName) {
  return USDC[name];
}
