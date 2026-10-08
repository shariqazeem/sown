/**
 * DAY-0 SMOKE 1 — THE SMART ACCOUNT KIT 0.8.0, WITH STELLAR SDK 16.3.1, ON PROTOCOL 29.
 *
 * Headless on testnet: a software passkey (scripts/lib/soft-webauthn.ts) creates a wallet,
 * the deploy goes out through an in-process relay that pays with Sown's testnet sponsor
 * (the kit's `{ func, auth }` shape, as /api/relay will receive it), the sponsor funds the
 * wallet with 5 XLM, and the passkey moves 1 XLM to a G-address. Two passkey prompts, zero XLM
 * from the wallet's owner. Any XDR or auth error here makes passkeys a cut candidate.
 *
 *   npx tsx scripts/smoke/kit-testnet.ts
 */
import http from "node:http";
import { Address, nativeToScVal } from "@stellar/stellar-sdk";
import { MemoryStorage, SmartAccountKit } from "smart-account-kit";
import { decodeFuncAuth, submitFuncAuth } from "@/lib/relay/submit";
import { baseNetwork } from "@/lib/stellar/network";
import { invokeAs, read } from "@/lib/stellar/soroban";
import { address, keypair } from "../lib/keys";
import { softPasskey } from "../lib/soft-webauthn";

const net = baseNetwork("testnet");
// Smart Account Kit deployments, Protocol 27, 2026-07-09 (docs/RESEARCH.md §6).
const ACCOUNT_WASM = "1b5f4534a76322da2ad7c745f6900857a6802b0ca79850c35a03561df997785a";
const VERIFIER = "CC7EKIHQP3TN4CARQDND6CEOY2UXLWWC2X5GHTD5NLAT7BG5GPZIOM3F";
const XLM = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => resolve(s));
  });
}

async function main() {
  const sponsor = keypair("sown-sponsor");
  const recipient = address("sown-recipient");
  const relayed: string[] = [];

  const relay = http.createServer(async (req, res) => {
    const body = JSON.parse(await readBody(req)) as { func?: string; auth?: string[]; xdr?: string };
    res.setHeader("content-type", "application/json");
    if (!body.func) {
      res.end(JSON.stringify({ success: false, error: "Only { func, auth } is accepted." }));
      return;
    }
    const dec = decodeFuncAuth(body.func, body.auth ?? []);
    if (!dec.ok) {
      res.end(JSON.stringify({ success: false, error: dec.why }));
      return;
    }
    relayed.push(dec.value.func.switch().name);
    const landed = await submitFuncAuth(net, sponsor, dec.value.func, dec.value.auth);
    res.end(JSON.stringify(landed.ok ? { success: true, data: { hash: landed.value.hash, status: "SUCCESS" } } : { success: false, error: landed.why }));
  });
  await new Promise<void>((r) => relay.listen(0, "127.0.0.1", () => r()));
  const port = (relay.address() as { port: number }).port;

  const passkey = softPasskey("http://localhost:3100", "localhost");
  const kit = new SmartAccountKit({
    rpcUrl: net.rpcUrl,
    networkPassphrase: net.passphrase,
    accountWasmHash: ACCOUNT_WASM,
    webauthnVerifierAddress: VERIFIER,
    relayerUrl: `http://127.0.0.1:${port}`,
    storage: new MemoryStorage(),
    rpId: "localhost",
    rpName: "Sown",
    allowedOrigins: [passkey.origin],
    webAuthn: passkey.webAuthn as never,
  });

  const t0 = Date.now();
  const created = await kit.createWallet("Sown", "smoke", { autoSubmit: true });
  const deployHash = created.submitResult && "hash" in created.submitResult ? created.submitResult.hash : undefined;
  console.log(`wallet ${created.contractId}`);
  console.log(`  deploy: ${created.submitResult?.success ? "landed" : "FAILED"} ${deployHash ?? ""} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (!created.submitResult?.success) {
    console.log("  ", JSON.stringify(created.submitResult, null, 1).slice(0, 800));
    process.exit(1);
  }

  const fund = await invokeAs(net, sponsor, XLM, "transfer", [
    Address.fromString(sponsor.publicKey()).toScVal(),
    Address.fromString(created.contractId).toScVal(),
    nativeToScVal(5_0000000n, { type: "i128" }),
  ]);
  console.log(`  funded 5 XLM: ${fund.ok ? fund.value.hash : fund.why}`);

  const before = await read<bigint>(net, XLM, "balance", [Address.fromString(recipient).toScVal()]);
  const t1 = Date.now();
  const moved = await kit.transfer(XLM, recipient, 1);
  const after = await read<bigint>(net, XLM, "balance", [Address.fromString(recipient).toScVal()]);
  console.log(`  passkey transfer 1 XLM → ${recipient.slice(0, 6)}…: ${moved.success ? "landed " + moved.hash : "FAILED " + moved.error.message} in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
  if (before.ok && after.ok) console.log(`  recipient balance moved by ${(Number(BigInt(after.value) - BigInt(before.value)) / 1e7).toFixed(7)} XLM`);
  console.log(`  passkey prompts: ${passkey.prompts()}; relayed: ${relayed.join(", ")}`);
  relay.close();
  process.exit(moved.success ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
