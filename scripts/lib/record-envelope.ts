// Records `get(id)` as returned by the testnet contract, for the decoder's offline test.
import { writeFileSync } from "node:fs";
import { nativeToScVal } from "@stellar/stellar-sdk";
import { deployment } from "@/lib/deployments";
import { baseNetwork } from "@/lib/stellar/network";
import { simulate } from "@/lib/stellar/soroban";
const net = baseNetwork("testnet");
const d = deployment("testnet")!;
const out: Record<string, string> = {};
for (const id of [1, 2, 3]) {
  const r = await simulate(net, d.contractId, "get", [nativeToScVal(BigInt(id), { type: "u64" })]);
  if (!r.ok) throw new Error(r.why);
  out[String(id)] = r.value.retval!.toXDR("base64");
}
writeFileSync("src/lib/envelope/fixtures.json", JSON.stringify({ contract: d.contractId, readAt: new Date().toISOString(), get: out }, null, 2) + "\n");
console.log("recorded get(1..3)");
