import { type NextRequest, NextResponse } from "next/server";
import { recordTx } from "@/lib/db";
import { relayClaim, relayPasskeyClaim, relayTrustlines } from "@/lib/relay/handle";
import { clientIp, relayDeps } from "@/lib/server/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/relay — Sown's servers pay the network for a recipient, after inspecting exactly
 * what they are asked to pay for (src/lib/relay/). Three kinds: "claim", "passkey",
 * "trustlines". Every refusal is a sentence; nothing is signed that was not inspected.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.kind !== "string") return NextResponse.json({ ok: false, why: "Say what Sown's servers should do." }, { status: 400 });
  const deps = relayDeps();
  if (!deps.ok) return NextResponse.json({ ok: false, why: deps.why }, { status: 503 });
  const ip = clientIp(req.headers);
  switch (body.kind) {
    case "claim": {
      const r = await relayClaim(deps.value, body, ip);
      if (!r.ok) return NextResponse.json({ ok: false, why: r.why }, { status: 422 });
      recordTx(String(body.id), "claim", r.value.claimTx, r.value.ledger, Math.floor(Date.now() / 1000));
      return NextResponse.json({ ok: true, ...r.value });
    }
    case "passkey": {
      const r = await relayPasskeyClaim(deps.value, body, ip);
      if (!r.ok) return NextResponse.json({ ok: false, why: r.why }, { status: 422 });
      recordTx(String(body.id), "claim", r.value.claimTx, r.value.ledger, Math.floor(Date.now() / 1000));
      if (r.value.deployTx) recordTx(String(body.id), "deploy", r.value.deployTx, r.value.ledger, Math.floor(Date.now() / 1000));
      return NextResponse.json({ ok: true, ...r.value });
    }
    case "trustlines": {
      const r = await relayTrustlines(deps.value, body, ip);
      if (!r.ok) return NextResponse.json({ ok: false, why: r.why }, { status: 422 });
      return NextResponse.json({ ok: true, ...r.value });
    }
    default:
      return NextResponse.json({ ok: false, why: "Sown's servers do not do that." }, { status: 400 });
  }
}
