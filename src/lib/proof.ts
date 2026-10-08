import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Deployment, deployment } from "@/lib/deployments";
import { readAll } from "@/lib/envelope/read";
import type { Envelope } from "@/lib/envelope/types";
import { type Outcome, held, ok } from "@/lib/outcome";
import { sponsorAddress } from "@/lib/server/config";
import { type OnChainCode, codeOf } from "@/lib/stellar/code";
import { type HorizonAccount, horizonAccount, nativeBalance } from "@/lib/stellar/horizon";
import { gated } from "@/lib/stellar/limiter";
import { type NetworkConfig, network } from "@/lib/stellar/network";
import { envelopeIsTeam } from "@/lib/team";

/**
 * THE PROOF PAGE'S FACTS, EACH READ FROM THE CHAIN AS THE PAGE LOADS: the code the contract
 * runs (dumped back and hashed), the admin, what Sown's servers hold and have paid, and every
 * envelope. Each part holds on its own: one unreadable part never blanks the others.
 */
export type Counts = { readonly sent: number; readonly claimed: number; readonly returned: number; readonly open: number; readonly outsideTeam: number; readonly measured: number };

export type ServersFacts = { readonly address: string; readonly xlm: number; readonly feesPaidStroops: bigint; readonly txs: number; readonly reservesHeld: number; readonly sponsoring: number; readonly capped: boolean };

export type Proof = {
  readonly net: NetworkConfig;
  readonly deployment: Deployment | null;
  readonly code: Outcome<OnChainCode>;
  readonly builtSha256: string | null;
  readonly envelopes: Outcome<Envelope[]>;
  readonly counts: Counts | null;
  readonly servers: Outcome<ServersFacts>;
};

function builtSha(): string | null {
  try {
    return readFileSync(join(process.cwd(), "artifacts", "sown.wasm.sha256"), "utf8").trim();
  } catch {
    return null;
  }
}

export function countsOf(all: readonly Envelope[]): Counts {
  return {
    sent: all.length,
    claimed: all.filter((e) => e.state === "claimed").length,
    returned: all.filter((e) => e.state === "returned").length,
    open: all.filter((e) => e.state === "open").length,
    outsideTeam: all.filter((e) => !envelopeIsTeam(e)).length,
    measured: all.filter((e) => e.measuredAt > 0).length,
  };
}

/** Every fee Sown's servers have paid, from their own transaction history on Horizon. */
async function serversFacts(net: NetworkConfig, address: string): Promise<Outcome<ServersFacts>> {
  const acct = await horizonAccount(net, address);
  if (!acct.ok) return acct;
  if (!acct.value) return held("Sown's servers have no account on this network yet.");
  let url: string | null = `${net.horizonUrl}/accounts/${address}/transactions?order=desc&limit=200&include_failed=true`;
  let fees = 0n;
  let txs = 0;
  let pages = 0;
  while (url && pages < 10) {
    const res: Response = await gated(net.horizonUrl, () => fetch(url!, { cache: "no-store", signal: AbortSignal.timeout(10_000) }));
    if (!res.ok) break;
    const body = (await res.json()) as { _embedded: { records: Array<{ fee_charged: string; fee_account: string }> }; _links: { next?: { href: string } } };
    const records = body._embedded.records;
    for (const r of records) {
      if (r.fee_account === address) {
        fees += BigInt(r.fee_charged);
        txs += 1;
      }
    }
    pages += 1;
    url = records.length === 200 ? (body._links.next?.href ?? null) : null;
  }
  const a: HorizonAccount = acct.value;
  return ok({ address, xlm: nativeBalance(a), feesPaidStroops: fees, txs, reservesHeld: a.num_sponsoring * 0.5, sponsoring: a.num_sponsoring, capped: url !== null });
}

export async function readProof(): Promise<Proof> {
  const net = network();
  const d = deployment(net.name);
  const sponsor = sponsorAddress();
  const [code, envelopes, servers] = await Promise.all([
    d ? codeOf(net, d.contractId) : Promise.resolve(held<OnChainCode>(`Sown is not deployed on ${net.name} yet.`)),
    d ? readAll(net, d.contractId, 300) : Promise.resolve(held<Envelope[]>(`Sown is not deployed on ${net.name} yet.`)),
    sponsor ? serversFacts(net, sponsor) : Promise.resolve(held<ServersFacts>("Sown's servers are not configured on this deployment.")),
  ]);
  return { net, deployment: d, code, builtSha256: builtSha(), envelopes, counts: envelopes.ok ? countsOf(envelopes.value) : null, servers };
}
