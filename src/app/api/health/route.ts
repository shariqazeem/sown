import { NextResponse } from "next/server";
import { contractId } from "@/lib/deployments";
import { sponsorAddress } from "@/lib/server/config";
import { horizonAccount, nativeBalance } from "@/lib/stellar/horizon";
import { network } from "@/lib/stellar/network";

export const dynamic = "force-dynamic";

/** GET /api/health — the network, the contract, the latest ledger, and what the sponsor holds. */
export async function GET() {
  const net = network();
  const sponsor = sponsorAddress();
  let latest: number | null = null;
  try {
    const r = await fetch(net.rpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLatestLedger" }), signal: AbortSignal.timeout(6_000) });
    latest = ((await r.json()) as { result?: { sequence?: number } }).result?.sequence ?? null;
  } catch {
    latest = null;
  }
  const acct = sponsor ? await horizonAccount(net, sponsor) : null;
  const xlm = acct && acct.ok && acct.value ? nativeBalance(acct.value) : null;
  return NextResponse.json({ network: net.name, contract: contractId(net.name), latestLedger: latest, sponsor, sponsorXlm: xlm, relay: !!process.env.SOWN_SPONSOR_SECRET }, { headers: { "cache-control": "no-store" } });
}
