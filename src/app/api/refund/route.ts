import { type NextRequest, NextResponse } from "next/server";
import { Address, FeeBumpTransaction, Operation, StrKey, TransactionBuilder, nativeToScVal, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import { recordTx } from "@/lib/db";
import { contractId } from "@/lib/deployments";
import { readEnvelope } from "@/lib/envelope/read";
import { gated } from "@/lib/stellar/limiter";
import { network } from "@/lib/stellar/network";
import { inclusionFee, INSTRUCTION_LEEWAY, rpcServer, sendAndWait, simulationReason } from "@/lib/stellar/soroban";

export const dynamic = "force-dynamic";

/**
 * POST /api/refund — "Take it back". With { id, by }: the refund, simulated and assembled for
 * the sender's wallet to sign (the sender is the source, so one signature authorises it). With
 * { signedXdr }: checked to be exactly one refund on the Sown contract from its own source,
 * submitted and waited for. Sown signs nothing here.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { id?: unknown; by?: unknown; signedXdr?: unknown } | null;
  const net = network();
  const contract = contractId(net.name);
  if (!contract) return NextResponse.json({ error: `Sown is not deployed on ${net.name} yet.` }, { status: 503 });
  const server = rpcServer(net);

  if (body && typeof body.signedXdr === "string") {
    let tx;
    try {
      tx = TransactionBuilder.fromXDR(body.signedXdr, net.passphrase);
    } catch {
      return NextResponse.json({ error: "That is not a signed transaction." }, { status: 400 });
    }
    if (tx instanceof FeeBumpTransaction || tx.operations.length !== 1 || tx.operations[0]!.type !== "invokeHostFunction") return NextResponse.json({ error: "That is not a refund." }, { status: 400 });
    const op = tx.operations[0] as Operation.InvokeHostFunction;
    if (op.func.switch().name !== "hostFunctionTypeInvokeContract") return NextResponse.json({ error: "That is not a refund." }, { status: 400 });
    const call = op.func.invokeContract();
    if (Address.fromScAddress(call.contractAddress()).toString() !== contract || call.functionName().toString() !== "refund") return NextResponse.json({ error: "That is not a refund on the Sown contract." }, { status: 400 });
    const [idVal, byVal] = call.args();
    if (!idVal || !byVal || Address.fromScAddress(byVal.address()).toString() !== tx.source) return NextResponse.json({ error: "A refund must come from the wallet that signs it." }, { status: 400 });
    const landed = await sendAndWait(net, tx);
    if (!landed.ok) return NextResponse.json({ error: landed.why }, { status: 422 });
    const id = String(scValToNative(idVal));
    recordTx(id, "refund", landed.value.hash, landed.value.ledger, landed.value.createdAt);
    return NextResponse.json({ id, hash: landed.value.hash });
  }

  const idText = typeof body?.id === "string" || typeof body?.id === "number" ? String(body?.id) : "";
  const by = typeof body?.by === "string" ? body.by : "";
  if (!/^\d{1,19}$/.test(idText) || !StrKey.isValidEd25519PublicKey(by)) return NextResponse.json({ error: "Name the envelope and the wallet asking." }, { status: 400 });
  const e = await readEnvelope(net, contract, BigInt(idText));
  if (!e.ok) return NextResponse.json({ error: e.why }, { status: 404 });
  if (e.value.state !== "open") return NextResponse.json({ error: e.value.state === "claimed" ? "It was already claimed." : "It already went back." }, { status: 409 });
  if (e.value.sender !== by && e.value.returnAt > Math.floor(Date.now() / 1000)) return NextResponse.json({ error: "Only the sender can take it back before its return date." }, { status: 403 });
  let account;
  try {
    account = await gated(net.rpcUrl, () => server.getAccount(by));
  } catch {
    return NextResponse.json({ error: "This wallet has no account on the network." }, { status: 400 });
  }
  const tx = new TransactionBuilder(account, { fee: await inclusionFee(net), networkPassphrase: net.passphrase })
    .addOperation(
      Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({ contractAddress: Address.fromString(contract).toScAddress(), functionName: "refund", args: [nativeToScVal(BigInt(idText), { type: "u64" }), Address.fromString(by).toScVal()] }),
        ),
        auth: [],
      }),
    )
    .setTimeout(300)
    .build();
  const sim = await gated(net.rpcUrl, () => server.simulateTransaction(tx, { cpuInstructions: INSTRUCTION_LEEWAY }));
  if (rpc.Api.isSimulationError(sim)) return NextResponse.json({ error: `The network would refuse this (${simulationReason(sim.error)}). Nothing moved.` }, { status: 422 });
  const assembled = rpc.assembleTransaction(tx, sim).build();
  return NextResponse.json({ xdr: assembled.toXDR(), feeStroops: assembled.fee, passphrase: net.passphrase });
}
