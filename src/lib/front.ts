import "server-only";
import { keepAssets } from "@/lib/assets/catalogue";
import { disclose } from "@/lib/assets/issuer-flags";
import { contractId } from "@/lib/deployments";
import { readAll } from "@/lib/envelope/read";
import type { Envelope } from "@/lib/envelope/types";
import { quote } from "@/lib/quote";
import { network } from "@/lib/stellar/network";
import { outsideTeam } from "@/lib/team";
import type { CardAsset, Quote } from "@/components/send/types";

/**
 * WHAT THE FRONT DOOR READS FROM THE CHAIN before it renders: the keep assets with their issuer
 * lines, a quote for the card's opening state (the pool's own estimate), and the latest claimed
 * envelope sent by someone outside the team. Any of these may be missing; the page says so in
 * words and never fills the gap with a sample.
 */
export async function cardAssets(): Promise<CardAsset[]> {
  const net = network();
  const rows = await Promise.all(keepAssets(net.name).map((a) => disclose(net, a)));
  return rows.map(({ asset: a, sentence }) => ({
    key: a.key,
    sac: a.sac,
    name: a.name,
    fullName: a.fullName,
    ticker: a.ticker,
    issuerName: a.issuerName,
    standIn: a.standIn,
    disclosure: sentence,
    quote: a.quote,
    quoteSource: a.quoteSource,
    quoteSourceLabel: a.quoteSourceLabel,
    issuerPage: a.issuerPage,
    poolFeeBps: a.poolFeeBps,
  }));
}

/**
 * The front door is read by strangers all day; the pool's price and the contract's newest
 * envelopes change slowly. Each is held for a few seconds per server, so the first byte comes
 * from memory and the figures are never more than that old. A send still quotes live.
 */
const HOLD_QUOTE_MS = 15_000;
const HOLD_LATEST_MS = 20_000;
type Held<T> = { readonly at: number; readonly value: T };
const held = globalThis as unknown as { __sownFront?: { quote?: Held<Quote | null>; latest?: Held<Envelope | null> } };
const store = () => (held.__sownFront ??= {});

export async function openingQuote(usd = 100, keepBps = 1_000): Promise<Quote | null> {
  const hit = store().quote;
  if (hit && Date.now() - hit.at < HOLD_QUOTE_MS) return hit.value;
  const net = network();
  const a = keepAssets(net.name)[0];
  if (!a || !contractId(net.name)) return null;
  const q = await quote(net, a, BigInt(usd) * 10_000_000n, keepBps);
  const value = q.ok ? q.value : null;
  if (value) store().quote = { at: Date.now(), value };
  return value;
}

export async function latestOutsideTeam(): Promise<Envelope | null> {
  const hit = store().latest;
  if (hit && Date.now() - hit.at < HOLD_LATEST_MS) return hit.value;
  const net = network();
  const id = contractId(net.name);
  if (!id) return null;
  const all = await readAll(net, id, 60);
  if (!all.ok) return null;
  const value = outsideTeam(all.value).find((e) => e.state === "claimed") ?? null;
  store().latest = { at: Date.now(), value };
  return value;
}
