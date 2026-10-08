import { type NextRequest, NextResponse } from "next/server";
import { relayMove } from "@/lib/relay/handle";
import { clientIp, relayDeps } from "@/lib/server/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/relay/kit — the Smart Account Kit's relayer endpoint, in the kit's own wire shape
 * ({ func, auth } in, { success, data: { hash } } out). It accepts one thing: a recipient moving
 * what they hold out of their passkey wallet (shape 4). Deployments and claims go through
 * /api/relay, where Sown's own code sends them.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.func !== "string") return NextResponse.json({ success: false, error: "Only a { func, auth } transfer is accepted here." }, { status: 400 });
  const deps = relayDeps();
  if (!deps.ok) return NextResponse.json({ success: false, error: deps.why }, { status: 503 });
  const r = await relayMove(deps.value, body, clientIp(req.headers));
  if (!r.ok) return NextResponse.json({ success: false, error: r.why }, { status: 422 });
  return NextResponse.json({ success: true, data: { hash: r.value.tx, status: "SUCCESS" } });
}
