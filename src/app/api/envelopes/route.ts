import { type NextRequest, NextResponse } from "next/server";
import { StrKey } from "@stellar/stellar-sdk";
import { contractId } from "@/lib/deployments";
import { readAll } from "@/lib/envelope/read";
import { envelopeToJson } from "@/lib/envelope/types";
import { network } from "@/lib/stellar/network";

export const dynamic = "force-dynamic";

/**
 * GET /api/envelopes?by=<address>&role=sent|claimed — the envelopes an address sent or claimed,
 * newest first, read from the contract (every envelope, filtered here: right for hundreds, and
 * the cache takes over past that).
 */
export async function GET(req: NextRequest) {
  const by = req.nextUrl.searchParams.get("by") ?? "";
  const role = req.nextUrl.searchParams.get("role") === "claimed" ? "claimed" : "sent";
  if (!(StrKey.isValidEd25519PublicKey(by) || StrKey.isValidContract(by))) return NextResponse.json({ error: "That is not a Stellar address." }, { status: 400 });
  const net = network();
  const id = contractId(net.name);
  if (!id) return NextResponse.json({ envelopes: [] });
  const all = await readAll(net, id, 300);
  if (!all.ok) return NextResponse.json({ error: all.why }, { status: 503 });
  const mine = all.value.filter((e) => (role === "sent" ? e.sender === by : e.claimedBy === by));
  return NextResponse.json({ envelopes: mine.map(envelopeToJson), at: Math.floor(Date.now() / 1000) }, { headers: { "cache-control": "no-store" } });
}
