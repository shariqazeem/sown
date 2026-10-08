import { NextResponse } from "next/server";
import { readReceipt } from "@/lib/envelope/receipt";
import { envelopeToJson } from "@/lib/envelope/types";

export const dynamic = "force-dynamic";

/** GET /api/envelope/<id> — the envelope from the contract, and its transactions. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await readReceipt(id);
  if (!r.ok) return NextResponse.json({ error: r.why }, { status: /no envelope|not an envelope/i.test(r.why) ? 404 : 503 });
  const v = r.value;
  return NextResponse.json(
    {
      envelope: envelopeToJson(v.envelope),
      asset: v.asset ? { key: v.asset.key, ticker: v.asset.ticker, name: v.asset.name, fullName: v.asset.fullName, issuerName: v.asset.issuerName, standIn: v.asset.standIn } : null,
      sendTx: v.sendTx,
      claimTx: v.claimTx,
      refundTx: v.refundTx,
      minKeepOut: v.minKeepOut?.toString() ?? null,
      contractId: v.contractId,
      network: v.net.name,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
