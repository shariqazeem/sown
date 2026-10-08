// Debugging aid: print a transaction's declared Soroban resources and its diagnostic events.
// npx tsx scripts/lib/inspect-tx.ts <hash>   (testnet)
import { rpc, xdr, scValToNative } from "@stellar/stellar-sdk";
const hash = process.argv[2]!;
const server = new rpc.Server("https://soroban-testnet.stellar.org");
const got = await server.getTransaction(hash);
console.log("status", got.status);
if ("envelopeXdr" in got) {
  const env = got.envelopeXdr;
  const tx = env.switch().name === "envelopeTypeTx" ? env.v1().tx() : null;
  const ext = tx?.ext();
  if (ext && ext.switch() === 1) {
    const sd = ext.sorobanData();
    const r = sd.resources();
    console.log("declared: instructions", r.instructions(), "diskRead", r.diskReadBytes?.() ?? "", "write", r.writeBytes(), "resourceFee", sd.resourceFee().toString());
    console.log("footprint RO", r.footprint().readOnly().length, "RW", r.footprint().readWrite().length);
  }
}
const diag = (got as unknown as { diagnosticEventsXdr?: xdr.DiagnosticEvent[] }).diagnosticEventsXdr;
for (const d of diag ?? []) {
  const e = d.event();
  const body = e.body().v0();
  const topics = body.topics().map((t: xdr.ScVal) => { try { return JSON.stringify(scValToNative(t), (_k, v) => typeof v === "bigint" ? v.toString() : v); } catch { return t.switch().name; } });
  let data: string; try { data = JSON.stringify(scValToNative(body.data()), (_k, v) => typeof v === "bigint" ? v.toString() : v); } catch { data = body.data().switch().name; }
  console.log(topics.join(" "), "=>", data.slice(0, 300));
}
