import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { keepAssetByKey } from "@/lib/assets/catalogue";
import { contractId } from "@/lib/deployments";
import { rawFromUsd } from "@/lib/format";
import { DEFAULT_RETURN_DAYS, prepareSend, returnAtFor } from "@/lib/send/build";
import { network } from "@/lib/stellar/network";

export const dynamic = "force-dynamic";

const Body = z.object({
  sender: z.string().min(56).max(56),
  usd: z.string().max(20),
  keepBps: z.number().int().min(0).max(10_000),
  asset: z.string().max(16),
  minKeepOut: z.string().regex(/^\d{1,30}$/),
  claimKey: z.string().regex(/^[0-9a-f]{64}$/),
  returnDays: z.number().int().min(1).max(365).optional(),
  /** sha256 of the note that rides in the link (note.ts); zeros, or absent, for no note. */
  memo: z.string().regex(/^[0-9a-f]{64}$/).optional(),
});

/** POST /api/send/prepare — the send, simulated and assembled for one wallet signature. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The send is missing something. Start again." }, { status: 400 });
  const b = parsed.data;
  const net = network();
  const contract = contractId(net.name);
  if (!contract) return NextResponse.json({ error: `Sown is not deployed on ${net.name} yet.` }, { status: 503 });
  const asset = keepAssetByKey(net.name, b.asset);
  if (!asset) return NextResponse.json({ error: "That keep asset is not offered here." }, { status: 400 });
  const amount = rawFromUsd(b.usd);
  if (amount === null) return NextResponse.json({ error: "That is not an amount." }, { status: 400 });
  const prepared = await prepareSend(net, contract, {
    sender: b.sender,
    amountRaw: amount,
    keepBps: b.keepBps,
    keepAsset: asset.sac,
    minKeepOutRaw: BigInt(b.minKeepOut),
    claimKeyHex: b.claimKey,
    memoHex: b.memo ?? "00".repeat(32),
    returnAt: returnAtFor(b.returnDays ?? DEFAULT_RETURN_DAYS, Math.floor(Date.now() / 1000)),
  });
  if (!prepared.ok) return NextResponse.json({ error: prepared.why }, { status: 422 });
  return NextResponse.json({ ...prepared.value, passphrase: net.passphrase });
}
