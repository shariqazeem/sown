/**
 * THE TESTNET BATTERY — every path a person takes, on the real contract and the real Aquarius
 * testnet pool, through the same modules the app and /api/relay run.
 *
 *   npm run battery:testnet
 *
 *   1. send 10 USDC keeping 10% (the XLM stand-in), from a G-account, one signature
 *   2. claim into a brand-new classic wallet: Sown's servers create it with 0 XLM, sponsor its
 *      USDC trustline (the wallet signs once), then pay for the claim
 *   3. claim into a brand-new passkey wallet: one (software) Face ID, Sown's servers deploy the
 *      wallet and pay for the claim
 *   4. the sender takes a send back; a stranger cannot before the date
 *   5. refusals: a second claim, a wrong link, a measurement before 30 days
 *
 * Writes deployments/testnet-battery.json with every transaction hash.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Address, Keypair, Operation, TransactionBuilder, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { MemoryStorage, SmartAccountKit } from "smart-account-kit";
import { USDC, keepAssets } from "@/lib/assets/catalogue";
import { deployment } from "@/lib/deployments";
import { newSecret, signClaim } from "@/lib/envelope/claim";
import { readEnvelope } from "@/lib/envelope/read";
import { KIT } from "@/lib/passkey/config";
import { type RelayDeps, relayClaim, relayPasskeyClaim, relayTrustlines } from "@/lib/relay/handle";
import { resetLimits } from "@/lib/relay/limit";
import { baseNetwork } from "@/lib/stellar/network";
import { invokeAs, read, rpcServer, sendAndWait, simulate } from "@/lib/stellar/soroban";
import { kitRelay } from "./lib/kit-relay";
import { ROOT, keypair } from "./lib/keys";
import { sendFromKey } from "./lib/send-from-key";
import { softPasskey } from "./lib/soft-webauthn";

const net = baseNetwork("testnet");
const d = deployment("testnet");
if (!d) throw new Error("No testnet deployment: run npm run contract:deploy:testnet first.");
const CONTRACT = d.contractId;
const usdc = USDC.testnet;
const keep = keepAssets("testnet")[0]!;
const u7 = (v: bigint | string) => (Number(v) / 1e7).toFixed(7);
const evidence: Record<string, unknown> = { network: "testnet", contract: CONTRACT, at: new Date().toISOString(), steps: [] as unknown[] };
const step = (name: string, data: Record<string, unknown>) => {
  (evidence.steps as unknown[]).push({ name, ...data });
  console.log(`✓ ${name}`, Object.entries(data).map(([k, v]) => `${k}=${typeof v === "bigint" ? v.toString() : String(v)}`).join("  "));
};
let failures = 0;
const expect = (ok: boolean, what: string) => {
  if (!ok) {
    failures += 1;
    console.log(`✗ ${what}`);
  }
};

async function balanceOf(token: string, who: string): Promise<bigint> {
  const r = await read<bigint>(net, token, "balance", [Address.fromString(who).toScVal()]);
  return r.ok ? BigInt(r.value) : 0n;
}

/** Testnet XLM for the sender: Friendbot funds one account once, so a fresh one is funded and merged in. */
async function topUpXlm(sender: Keypair) {
  const spare = Keypair.random();
  const res = await fetch(`https://friendbot.stellar.org/?addr=${spare.publicKey()}`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Friendbot answered ${res.status}`);
  const server = rpcServer(net);
  const acct = await server.getAccount(spare.publicKey());
  const tx = new TransactionBuilder(acct, { fee: "10000", networkPassphrase: net.passphrase }).addOperation(Operation.accountMerge({ destination: sender.publicKey() })).setTimeout(120).build();
  tx.sign(spare);
  const landed = await sendAndWait(net, tx);
  if (!landed.ok) throw new Error(`merging Friendbot's XLM into the sender: ${landed.why}`);
  step("topped up the sender with Friendbot's XLM", { tx: landed.value.hash });
}

/** Buy only the test USDC the sender is short of, from the same pool the sends use. */
async function ensureUsdc(sender: Keypair, want: bigint) {
  const have = await balanceOf(usdc.sac, sender.publicKey());
  if (have >= want) return;
  const probe = 100_0000000n;
  const est = await simulate(net, keep.pool, "estimate_swap", [nativeToScVal(keep.outIdx, { type: "u32" }), nativeToScVal(keep.inIdx, { type: "u32" }), nativeToScVal(probe, { type: "u128" })]);
  if (!est.ok) throw new Error(est.why);
  const per100 = BigInt(scValToNative(est.value.retval!));
  const xlmIn = ((want - have) * probe * 12n) / (per100 * 10n);
  if ((await balanceOf(keep.sac, sender.publicKey())) < xlmIn + 100_0000000n) await topUpXlm(sender);
  const out = await simulate(net, keep.pool, "estimate_swap", [nativeToScVal(keep.outIdx, { type: "u32" }), nativeToScVal(keep.inIdx, { type: "u32" }), nativeToScVal(xlmIn, { type: "u128" })]);
  if (!out.ok) throw new Error(out.why);
  const got = BigInt(scValToNative(out.value.retval!));
  const s = await invokeAs(net, sender, keep.pool, "swap", [Address.fromString(sender.publicKey()).toScVal(), nativeToScVal(keep.outIdx, { type: "u32" }), nativeToScVal(keep.inIdx, { type: "u32" }), nativeToScVal(xlmIn, { type: "u128" }), nativeToScVal((got * 98n) / 100n, { type: "u128" })]);
  if (!s.ok) throw new Error(s.why);
  step("bought test USDC for the sender", { usdc: u7(got), tx: s.value.hash });
}

async function send(sender: Keypair, usd: number, keepBps: number) {
  const r = await sendFromKey(net, CONTRACT, sender, keep, usd, keepBps);
  if (!r.ok) throw new Error(r.why);
  return r.value;
}

async function main() {
  resetLimits();
  const sponsor = keypair("sown-sponsor");
  const sender = keypair("sown-sender");
  const deps: RelayDeps = { net, contractId: CONTRACT, sponsor, kit: KIT.testnet, usdc, keepAssets: keepAssets("testnet") };
  console.log(`contract ${CONTRACT}\nsender ${sender.publicKey()}\nsponsor ${sponsor.publicKey()}\n`);
  await ensureUsdc(sender, 20_0000000n);

  // 1. A send, one signature.
  const a = await send(sender, 10, 1_000);
  const ea = await readEnvelope(net, CONTRACT, a.id);
  if (!ea.ok) throw new Error(ea.why);
  step("send 10 USDC, keep 10%", { id: a.id, tx: a.hash, seconds: a.seconds.toFixed(1), fee_stroops: a.fee, cash: u7(ea.value.cash), keep_in: u7(ea.value.keepIn), keep_out_xlm: u7(ea.value.keepOut), quoted: u7(a.quote.keepOutRaw), least: u7(a.quote.minKeepOutRaw) });
  expect(ea.value.cash + ea.value.keepIn === 10_0000000n, "cash + keep_in == amount");
  expect(ea.value.keepOut >= BigInt(a.quote.minKeepOutRaw), "keep_out >= the least it could become");
  expect(ea.value.state === "open", "the envelope is open");

  // 2. A claim into a classic wallet that does not exist yet.
  const fresh = Keypair.random();
  const t2 = Date.now();
  const prep = await relayTrustlines(deps, { id: a.id.toString(), account: fresh.publicKey() }, "battery");
  if (!prep.ok || !("xdr" in prep.value)) throw new Error(prep.ok ? "expected a transaction to sign" : prep.why);
  const trustTx = TransactionBuilder.fromXDR(prep.value.xdr, net.passphrase);
  trustTx.sign(fresh); // the one wallet prompt
  const trusted = await relayTrustlines(deps, { id: a.id.toString(), account: fresh.publicKey(), signed: trustTx.toXDR() }, "battery");
  if (!trusted.ok || !("tx" in trusted.value)) throw new Error(trusted.ok ? "expected a submitted transaction" : trusted.why);
  step("a new classic wallet, made ready to hold USDC by Sown's servers", { account: fresh.publicKey(), tx: trusted.value.tx });
  const claimed = await relayClaim(deps, { id: a.id.toString(), to: fresh.publicKey(), sig: signClaim(a.secret, CONTRACT, a.id, fresh.publicKey()).toString("hex") }, "battery");
  if (!claimed.ok) throw new Error(claimed.why);
  const gotUsdc = await balanceOf(usdc.sac, fresh.publicKey());
  const gotXlm = await balanceOf(keep.sac, fresh.publicKey());
  step("claimed into the classic wallet, paid by Sown's servers", { tx: claimed.value.claimTx, seconds: ((Date.now() - t2) / 1000).toFixed(1), usdc: u7(gotUsdc), xlm: u7(gotXlm) });
  expect(gotUsdc === ea.value.cash, "the wallet holds the cash");
  expect(gotXlm === ea.value.keepOut, "the wallet holds the keep");
  const again = await relayClaim(deps, { id: a.id.toString(), to: fresh.publicKey(), sig: signClaim(a.secret, CONTRACT, a.id, fresh.publicKey()).toString("hex") }, "battery");
  step("a second claim is refused", { why: again.ok ? "NOT REFUSED" : again.why });
  expect(!again.ok, "a second claim is refused");

  // 3. A claim into a passkey wallet made on the spot.
  const b = await send(sender, 5, 1_000);
  step("send 5 USDC, keep 10%", { id: b.id, tx: b.hash, seconds: b.seconds.toFixed(1) });
  // The kit's relayer endpoint, exactly as /api/relay/kit runs it: shape 4 and nothing else.
  const kitRelayServer = await kitRelay(deps, "battery");
  const storage = new MemoryStorage();
  const passkey = softPasskey("http://localhost:3100", "localhost");
  const kit = new SmartAccountKit({
    rpcUrl: net.rpcUrl,
    networkPassphrase: net.passphrase,
    accountWasmHash: KIT.testnet.accountWasmHash,
    webauthnVerifierAddress: KIT.testnet.webauthnVerifier,
    storage,
    rpId: "localhost",
    rpName: "Sown",
    allowedOrigins: [passkey.origin],
    webAuthn: passkey.webAuthn as never,
    relayerUrl: kitRelayServer.url,
  });
  const t3 = Date.now();
  const made = await kit.createWallet("Sown", "battery", { autoSubmit: false });
  if (!made.relayerPayload) throw new Error("the kit did not return a deployment payload");
  const viaPasskey = await relayPasskeyClaim(
    deps,
    { id: b.id.toString(), to: made.contractId, sig: signClaim(b.secret, CONTRACT, b.id, made.contractId).toString("hex"), func: made.relayerPayload.func, auth: made.relayerPayload.auth },
    "battery",
  );
  if (!viaPasskey.ok) throw new Error(viaPasskey.why);
  const eb = await readEnvelope(net, CONTRACT, b.id);
  const wUsdc = await balanceOf(usdc.sac, made.contractId);
  const wXlm = await balanceOf(keep.sac, made.contractId);
  step("claimed into a wallet made with one Face ID, Sown's servers paid both transactions", {
    wallet: made.contractId,
    deployTx: viaPasskey.value.deployTx,
    claimTx: viaPasskey.value.claimTx,
    seconds: ((Date.now() - t3) / 1000).toFixed(1),
    passkeyPrompts: passkey.prompts(),
    usdc: u7(wUsdc),
    xlm: u7(wXlm),
  });
  expect(passkey.prompts() === 1, "one passkey prompt");
  expect(eb.ok && eb.value.state === "claimed" && eb.value.claimedBy === made.contractId, "the envelope names the passkey wallet");
  expect(eb.ok && wUsdc === eb.value.cash && wXlm === eb.value.keepOut, "the passkey wallet holds both parts");

  // 3b. Move out of that wallet: reconnect from the stored birth (no prompt), one prompt to sign.
  await storage.update(made.credentialId, {
    contractId: made.contractId,
    deploymentStatus: "deployed",
    deploymentTransactionHash: viaPasskey.value.deployTx,
    creationTransactionHash: viaPasskey.value.deployTx,
    creationLedger: viaPasskey.value.deployLedger,
  });
  await kit.connectWallet({ credentialId: made.credentialId, contractId: made.contractId });
  const promptsBefore = passkey.prompts();
  const target = keypair("sown-recipient").publicKey();
  const t3b = Date.now();
  const moved = await kit.transfer(keep.sac, target, 1);
  if (!moved.success) throw new Error(`move: ${moved.error.message}`);
  const wXlmAfter = await balanceOf(keep.sac, made.contractId);
  step("moved 1 XLM out of the Face ID wallet, paid by Sown's servers", { tx: moved.hash, seconds: ((Date.now() - t3b) / 1000).toFixed(1), prompts: passkey.prompts() - promptsBefore, left: u7(wXlmAfter) });
  expect(passkey.prompts() - promptsBefore === 1, "one prompt to move, none to reconnect");
  expect(wXlmAfter === wXlm - 10_000_000n, "exactly 1 XLM left the wallet");
  kitRelayServer.close();

  // 4. Take it back; a stranger cannot before the date.
  const c = await send(sender, 2, 1_000);
  const stranger = Keypair.random();
  const early = await simulate(net, CONTRACT, "refund", [nativeToScVal(c.id, { type: "u64" }), Address.fromString(stranger.publicKey()).toScVal()], { source: stranger.publicKey() });
  step("a stranger cannot return it before the date", { refused: !early.ok, why: early.ok ? "" : early.why });
  expect(!early.ok && /#8\b/.test(early.why), "NotYet (#8) for a stranger");
  const back = await invokeAs(net, sender, CONTRACT, "refund", [nativeToScVal(c.id, { type: "u64" }), Address.fromString(sender.publicKey()).toScVal()]);
  if (!back.ok) throw new Error(back.why);
  const ec = await readEnvelope(net, CONTRACT, c.id);
  step("the sender took it back", { id: c.id, sendTx: c.hash, refundTx: back.value.hash, state: ec.ok ? ec.value.state : "?" });
  expect(ec.ok && ec.value.state === "returned", "the envelope is returned");

  // 5. Refusals that must not cost Sown anything.
  const e = await send(sender, 1, 500);
  const wrong = await relayClaim(deps, { id: e.id.toString(), to: fresh.publicKey(), sig: signClaim(newSecret(), CONTRACT, e.id, fresh.publicKey()).toString("hex") }, "battery");
  step("a wrong link is refused before anything is paid", { id: e.id, why: wrong.ok ? "NOT REFUSED" : wrong.why });
  expect(!wrong.ok, "a wrong link is refused");
  const measuredEarly = await simulate(net, CONTRACT, "measure", [nativeToScVal(a.id, { type: "u64" })]);
  step("still held cannot be measured before 30 days", { refused: !measuredEarly.ok, why: measuredEarly.ok ? "" : measuredEarly.why });
  expect(!measuredEarly.ok && /#8\b/.test(measuredEarly.why), "NotYet (#8) for an early measurement");
  // Leave the last envelope open on purpose: the claim page has one to show.
  evidence.openEnvelope = { id: e.id.toString(), note: "left open for the claim page; its link is not stored" };

  const count = await read<bigint>(net, CONTRACT, "count");
  evidence.count = count.ok ? Number(count.value) : null;
  evidence.failures = failures;
  writeFileSync(join(ROOT, "deployments", "testnet-battery.json"), `${JSON.stringify(evidence, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2)}\n`);
  console.log(`\n${failures === 0 ? "all green" : `${failures} FAILED`} · ${count.ok ? count.value : "?"} envelopes on the contract · deployments/testnet-battery.json`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
