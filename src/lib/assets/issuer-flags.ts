import "server-only";
import type { KeepAssetEntry } from "@/lib/assets/catalogue";
import { horizonAccount } from "@/lib/stellar/horizon";
import type { NetworkConfig } from "@/lib/stellar/network";
import { type IssuerFlags, disclosure } from "./disclosure";

/**
 * WHAT THE ISSUER CAN DO, READ FROM THE ISSUER'S ACCOUNT. Never written by hand: a flag the
 * issuer turns on tomorrow changes the sentence on every row the next time it is read. Held for
 * ten minutes per issuer so a page of three rows is one read, not three per visitor.
 */
const HOLD_MS = 10 * 60_000;
const KEY = Symbol.for("sown.issuerFlags");
type Cache = Map<string, { at: number; flags: IssuerFlags | null }>;

function cache(): Cache {
  const g = globalThis as unknown as Record<symbol, Cache | undefined>;
  return (g[KEY] ??= new Map());
}

export async function issuerFlags(net: NetworkConfig, issuer: string | null): Promise<IssuerFlags | null> {
  if (!issuer) return null;
  const hit = cache().get(`${net.name}:${issuer}`);
  if (hit && Date.now() - hit.at < HOLD_MS) return hit.flags;
  const acct = await horizonAccount(net, issuer);
  const flags = acct.ok && acct.value ? { ...acct.value.flags, readAt: Math.floor(Date.now() / 1000), homeDomain: acct.value.home_domain ?? null } : null;
  cache().set(`${net.name}:${issuer}`, { at: Date.now(), flags });
  return flags;
}

export type AssetDisclosure = { readonly asset: KeepAssetEntry; readonly flags: IssuerFlags | null; readonly sentence: string };

export async function disclose(net: NetworkConfig, asset: KeepAssetEntry): Promise<AssetDisclosure> {
  const flags = await issuerFlags(net, asset.issuer);
  return { asset, flags, sentence: disclosure(asset, flags) };
}
