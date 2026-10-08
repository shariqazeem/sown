import { type NextRequest, NextResponse } from "next/server";
import { scValToNative } from "@stellar/stellar-sdk";
import { recordTx } from "@/lib/db";
import { contractId } from "@/lib/deployments";
import { readEnvelope } from "@/lib/envelope/read";
import { envelopeToJson } from "@/lib/envelope/types";
import { inspectSignedSend } from "@/lib/send/build";
import { network } from "@/lib/stellar/network";
import { sendAndWait } from "@/lib/stellar/soroban";

export const dynamic = "force-dynamic";

/**
 * POST /api/send/record — the wallet's signed send: checked to be exactly one `send` on the
 * Sown contract from its own source, submitted, waited for, read back from the contract, and
 * its hash cached. Sown signs nothing here.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { signedXdr?: unknown } | null;
  if (!body || typeof body.signedXdr !== "string" || body.signedXdr.length > 20_000) return NextResponse.json({ error: "That is not a signed transaction." }, { status: 400 });
  const net = network();
  const contract = contractId(net.name);
  if (!contract) return NextResponse.json({ error: `Sown is not deployed on ${net.name} yet.` }, { status: 503 });
  const signed = inspectSignedSend(net.passphrase, body.signedXdr, contract);
  if (!signed.ok) return NextResponse.json({ error: signed.why }, { status: 400 });
  const landed = await sendAndWait(net, signed.value.tx, 90_000);
  if (!landed.ok) return NextResponse.json({ error: landed.why }, { status: 422 });
  const id = landed.value.returnValue ? BigInt(scValToNative(landed.value.returnValue) as bigint) : null;
  if (id === null) return NextResponse.json({ error: "The send landed but returned no envelope number.", hash: landed.value.hash }, { status: 502 });
  recordTx(id.toString(), "send", landed.value.hash, landed.value.ledger, landed.value.createdAt);
  const e = await readEnvelope(net, contract, id);
  return NextResponse.json({ id: id.toString(), hash: landed.value.hash, ledger: landed.value.ledger, envelope: e.ok ? envelopeToJson(e.value) : null });
}
