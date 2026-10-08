import { NextResponse } from "next/server";
import { StrKey } from "@stellar/stellar-sdk";
import { readHoldings } from "@/lib/holdings";

export const dynamic = "force-dynamic";

/** GET /api/holdings/<G… or C…> — USDC and every keep asset this address holds, read from the chain. */
export async function GET(_req: Request, { params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  if (!(StrKey.isValidEd25519PublicKey(addr) || StrKey.isValidContract(addr))) return NextResponse.json({ error: "That is not a Stellar address." }, { status: 400 });
  const h = await readHoldings(addr);
  if (!h.ok) return NextResponse.json({ error: h.why }, { status: 503 });
  return NextResponse.json(h.value, { headers: { "cache-control": "no-store" } });
}
