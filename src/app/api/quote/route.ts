import { type NextRequest, NextResponse } from "next/server";
import { keepAssetByKey } from "@/lib/assets/catalogue";
import { rawFromUsd } from "@/lib/format";
import { quote } from "@/lib/quote";
import { network } from "@/lib/stellar/network";

export const dynamic = "force-dynamic";

/** GET /api/quote?asset=usdy&usd=100&keep=1000 — what the slice becomes, from the pool, now. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const net = network();
  const asset = keepAssetByKey(net.name, p.get("asset") ?? "");
  if (!asset) return NextResponse.json({ error: "That keep asset is not offered here." }, { status: 400 });
  const amount = rawFromUsd(p.get("usd") ?? "");
  if (amount === null || amount < 10_000_000n || amount > 100_000_000_000n) return NextResponse.json({ error: "Choose an amount between $1 and $10,000." }, { status: 400 });
  const keep = Number(p.get("keep"));
  if (!Number.isInteger(keep) || keep < 0 || keep > 10_000) return NextResponse.json({ error: "The keep must be between 0% and 100%." }, { status: 400 });
  const q = await quote(net, asset, amount, keep);
  if (!q.ok) return NextResponse.json({ error: q.why }, { status: 503 });
  return NextResponse.json(q.value, { headers: { "cache-control": "no-store" } });
}
