/**
 * THE MAINNET SMOKE — the whole path once, with a dollar of real money, timed, before anyone
 * else is asked to try it. It runs the modules the app and /api/relay run, nothing of its own.
 *
 *   npm run smoke:mainnet -- --dry                   read only: the code, the asset, both balances, the send simulated
 *   SOWN_MAINNET=yes SOWN_SPONSOR_SECRET=S… SOWN_SMOKE_SENDER_SECRET=S… npm run smoke:mainnet
 *   npm run smoke:mainnet -- --record <id>           after the film's run (a wallet, a phone): its hashes and timing
 *   npm run smoke:mainnet -- --recover <wallet>      move what a smoke wallet still holds back to the sender
 *   npm run smoke:mainnet -- --network testnet       the same code on testnet, with this project's .keys/
 *
 * Options: --usd 1 · --keep 10 (percent) · --asset usdy|ustry|cetes · --again (a second run within the hour)
 * A dry run on mainnet reads SOWN_SPONSOR_PUBLIC and SOWN_SMOKE_SENDER_PUBLIC when no secret is set.
 *
 *   1. send $1 keeping 10% as US Treasuries (USDY), one signature from the sender's key
 *   2. claim it into a wallet made on the spot with one software passkey: Sown's servers make
 *      the wallet and pay for the claim, through the relay's own checks. If the claim fails,
 *      the sender takes the envelope straight back.
 *   3. move both parts back to the sender, paid by Sown's servers through the checks
 *      /api/relay/kit runs (the sender is first made ready to hold the keep, if it is not)
 *   4. write deployments/<network>-smoke.json: every hash, and how long each step took
 *
 * The passkey's key is written to .keys/ before the claim (never printed, never committed), so
 * whatever the wallet holds can always be moved back with --recover; it is deleted once the
 * wallet is empty. Mainnet secrets are read from the environment only.
 */
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Address, Asset, Keypair, Operation, TransactionBuilder, nativeToScVal } from "@stellar/stellar-sdk";
import { MemoryStorage, SmartAccountKit, type StoredCredential } from "smart-account-kit";
import { type KeepAssetEntry, USDC, keepAssetByKey, keepAssetBySac, keepAssets } from "@/lib/assets/catalogue";
import { deployment } from "@/lib/deployments";
import { signClaim } from "@/lib/envelope/claim";
import { eventTx, readEnvelope } from "@/lib/envelope/read";
import { units, xlm } from "@/lib/format";
import { KIT } from "@/lib/passkey/config";
import { type RelayDeps, relayPasskeyClaim } from "@/lib/relay/handle";
import { wasmHashOf } from "@/lib/stellar/code";
import { type HorizonAccount, hasTrustline, horizonAccount, nativeBalance } from "@/lib/stellar/horizon";
import { gated } from "@/lib/stellar/limiter";
import { type NetworkName, baseNetwork } from "@/lib/stellar/network";
import { invokeAs, read, rpcServer, sendAndWait } from "@/lib/stellar/soroban";
import { kitRelay } from "./lib/kit-relay";
import { ROOT, keypair, keypairFromEnv } from "./lib/keys";
import { prepareFrom, sendFromKey } from "./lib/send-from-key";
import { type SavedPasskey, softPasskey } from "./lib/soft-webauthn";

const argv = process.argv.slice(2);
const has = (k: string) => argv.includes(k);
const arg = (k: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined);

const which = (arg("--network") ?? "mainnet") as NetworkName;
if (which !== "mainnet" && which !== "testnet") throw new Error("--network is mainnet or testnet.");
const net = baseNetwork(which);
const d = deployment(which);
const usd = Number(arg("--usd") ?? 1);
const keepBps = Math.round(Number(arg("--keep") ?? 10) * 100);
const EVIDENCE = join(ROOT, "deployments", `${which}-smoke.json`);
// The software passkey's origin. The wallet's on-chain verifier checks the signature, not where
// it was made, so a wallet made here can be moved out of from here, and from nowhere else.
const ORIGIN = "http://localhost:3100";
const RP_ID = "localhost";
const BASE_RESERVE = 0.5;

const LEDGER_SECONDS = (a: number, b: number) => Math.max(0, b - a);

type Step = { name: string; [k: string]: unknown };
type Evidence = {
  network: NetworkName;
  contract: string;
  at: string;
  usd?: number;
  keepBps?: number;
  asset?: string;
  sender?: string;
  wallet?: string;
  steps: Step[];
  seconds?: Record<string, number>;
  failures?: number;
  film?: Record<string, unknown>;
};

const say = (ok: boolean, text: string) => console.log(`${ok ? "✓" : "✗"} ${text}`);

function readEvidence(): Evidence | null {
  if (!existsSync(EVIDENCE)) return null;
  try {
    return JSON.parse(readFileSync(EVIDENCE, "utf8")) as Evidence;
  } catch {
    return null;
  }
}

function writeEvidence(e: Evidence) {
  writeFileSync(EVIDENCE, `${JSON.stringify(e, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2)}\n`);
}

/** Raw 7-decimal units → the number the kit's transfer takes (its decimal text, exactly). */
function asUnits(raw: bigint): number {
  return Number(`${raw / 10_000_000n}.${(raw % 10_000_000n).toString().padStart(7, "0")}`);
}

async function balanceOf(token: string, who: string): Promise<bigint> {
  const r = await read<bigint>(net, token, "balance", [Address.fromString(who).toScVal()]);
  return r.ok ? BigInt(r.value) : 0n;
}

/** XLM an account can spend: its balance less the minimum the network holds back. */
function spendable(a: HorizonAccount): number {
  const locked = (2 + a.subentry_count + a.num_sponsoring - a.num_sponsored) * BASE_RESERVE;
  return nativeBalance(a) - locked;
}

function classicBalance(a: HorizonAccount, code: string, issuer: string): number {
  const b = a.balances.find((x) => x.asset_code === code && x.asset_issuer === issuer);
  return b ? Number(b.balance) : 0;
}

// ── keys ────────────────────────────────────────────────────────────────────────────────────

function signers(): { sponsor: Keypair; sender: Keypair } {
  if (which === "testnet") return { sponsor: keypair("sown-sponsor"), sender: keypair("sown-sender") };
  if (process.env.SOWN_MAINNET !== "yes") throw new Error("A mainnet run moves real money: set SOWN_MAINNET=yes, SOWN_SPONSOR_SECRET and SOWN_SMOKE_SENDER_SECRET. Try --dry first.");
  return { sponsor: keypairFromEnv("SOWN_SPONSOR_SECRET"), sender: keypairFromEnv("SOWN_SMOKE_SENDER_SECRET") };
}

function addresses(): { sponsor: string | null; sender: string | null } {
  if (which === "testnet") {
    const k = signers();
    return { sponsor: k.sponsor.publicKey(), sender: k.sender.publicKey() };
  }
  const from = (secret: string, pub: string): string | null => {
    const s = process.env[secret];
    if (s?.startsWith("S")) return Keypair.fromSecret(s).publicKey();
    return process.env[pub] ?? null;
  };
  return { sponsor: from("SOWN_SPONSOR_SECRET", "SOWN_SPONSOR_PUBLIC"), sender: from("SOWN_SMOKE_SENDER_SECRET", "SOWN_SMOKE_SENDER_PUBLIC") };
}

function relayDepsFor(sponsor: Keypair): RelayDeps {
  return { net, contractId: d!.contractId, sponsor, kit: KIT[which], usdc: USDC[which], keepAssets: keepAssets(which) };
}

// ── the wallet's key, kept under .keys/ while the wallet holds anything ─────────────────────────

type SavedWallet = { network: NetworkName; wallet: string; passkey: SavedPasskey; credential: Omit<StoredCredential, "publicKey"> & { publicKey: string } };

const walletFile = (wallet: string) => join(ROOT, ".keys", `smoke-${which}-${wallet}.json`);

async function saveWallet(wallet: string, passkey: ReturnType<typeof softPasskey>, storage: MemoryStorage) {
  const key = await passkey.save();
  const cred = (await storage.getByContract(wallet))[0] ?? (await storage.getAll())[0];
  if (!key || !cred) throw new Error("the passkey or its credential is missing; nothing was claimed");
  const saved: SavedWallet = { network: which, wallet, passkey: key, credential: { ...cred, contractId: wallet, publicKey: Buffer.from(cred.publicKey).toString("base64") } };
  writeFileSync(walletFile(wallet), JSON.stringify(saved));
  chmodSync(walletFile(wallet), 0o600);
}

function makeKit(storage: MemoryStorage, passkey: ReturnType<typeof softPasskey>, relayerUrl?: string) {
  return new SmartAccountKit({
    rpcUrl: net.rpcUrl,
    networkPassphrase: net.passphrase,
    accountWasmHash: KIT[which].accountWasmHash,
    webauthnVerifierAddress: KIT[which].webauthnVerifier,
    storage,
    rpId: RP_ID,
    rpName: "Sown",
    allowedOrigins: [passkey.origin],
    webAuthn: passkey.webAuthn as never,
    ...(relayerUrl ? { relayerUrl } : {}),
  });
}

/** The sender, made ready to hold an asset it is about to receive back (0.5 XLM set aside, returned if it lets go). */
async function readyToHold(sender: Keypair, asset: KeepAssetEntry): Promise<string | null> {
  if (!asset.issuer) return null;
  const a = await horizonAccount(net, sender.publicKey());
  if (!a.ok || !a.value) throw new Error(`the sender's account: ${a.ok ? "not found" : a.why}`);
  if (hasTrustline(a.value, asset.code, asset.issuer)) return null;
  const server = rpcServer(net);
  const acct = await gated(net.rpcUrl, () => server.getAccount(sender.publicKey()));
  const tx = new TransactionBuilder(acct, { fee: "10000", networkPassphrase: net.passphrase })
    .addOperation(Operation.changeTrust({ asset: new Asset(asset.code, asset.issuer) }))
    .setTimeout(120)
    .build();
  tx.sign(sender);
  const landed = await sendAndWait(net, tx);
  if (!landed.ok) throw new Error(`making the sender ready to hold ${asset.ticker}: ${landed.why}`);
  return landed.value.hash;
}

/** Move everything a smoke wallet holds back to the sender. Restores the wallet from .keys/, as --recover does. */
async function moveBack(sponsor: Keypair, sender: Keypair, wallet: string, steps: Step[]): Promise<number> {
  const file = walletFile(wallet);
  if (!existsSync(file)) throw new Error(`no saved key for ${wallet} under .keys/`);
  const saved = JSON.parse(readFileSync(file, "utf8")) as SavedWallet;
  const passkey = softPasskey(saved.passkey.origin, saved.passkey.rpId, saved.passkey);
  const storage = new MemoryStorage();
  await storage.save({ ...saved.credential, publicKey: new Uint8Array(Buffer.from(saved.credential.publicKey, "base64")) } as StoredCredential);
  const relay = await kitRelay(relayDepsFor(sponsor), "smoke");
  let failures = 0;
  try {
    const kit = makeKit(storage, passkey, relay.url);
    await kit.connectWallet({ credentialId: saved.credential.credentialId, contractId: wallet });
    const held: Array<{ sac: string; label: string; asset: KeepAssetEntry | null }> = [
      { sac: USDC[which].sac, label: "USDC", asset: null },
      ...keepAssets(which).map((a) => ({ sac: a.sac, label: a.ticker, asset: a })),
    ];
    for (const h of held) {
      const bal = await balanceOf(h.sac, wallet);
      if (bal <= 0n) continue;
      if (h.asset) {
        const ready = await readyToHold(sender, h.asset);
        if (ready) steps.push({ name: `the sender was made ready to hold ${h.asset.name} again`, tx: ready });
      }
      const t = Date.now();
      const before = passkey.prompts();
      const moved = await kit.transfer(h.sac, sender.publicKey(), asUnits(bal));
      if (!moved.success) {
        failures += 1;
        say(false, `moving ${units(bal)} ${h.label} back: ${moved.error.message}`);
        continue;
      }
      const step = { name: `moved ${units(bal)} ${h.label} back to the sender, paid by Sown's servers`, tx: moved.hash, seconds: ((Date.now() - t) / 1000).toFixed(1), prompts: passkey.prompts() - before };
      steps.push(step);
      say(true, `${step.name}  ${moved.hash}  ${step.seconds} s`);
    }
  } finally {
    relay.close();
  }
  const left = await Promise.all([USDC[which].sac, ...keepAssets(which).map((a) => a.sac)].map((sac) => balanceOf(sac, wallet)));
  if (left.every((b) => b === 0n)) {
    rmSync(file);
    say(true, `the wallet is empty; its key was removed from .keys/`);
  } else {
    failures += 1;
    say(false, `the wallet still holds something; its key stays in .keys/ — run: npm run smoke:mainnet -- --network ${which} --recover ${wallet}`);
  }
  return failures;
}

// ── the checks a dry run makes, and a real run makes first ───────────────────────────────────

async function checks(asset: KeepAssetEntry): Promise<number> {
  let problems = 0;
  const check = (ok: boolean, text: string) => {
    if (!ok) problems += 1;
    say(ok, text);
  };
  const code = await wasmHashOf(net, d!.contractId);
  check(code.ok && code.value === d!.wasmHash, `the contract's code on the ledger is artifacts/sown.wasm: ${code.ok ? code.value.slice(0, 16) : code.why}…`);
  const cfg = await read<{ pool: string; in_idx: number; out_idx: number; enabled: boolean }>(net, d!.contractId, "asset", [Address.fromString(asset.sac).toScVal()]);
  check(
    cfg.ok && cfg.value.enabled && cfg.value.pool === asset.pool && Number(cfg.value.in_idx) === asset.inIdx && Number(cfg.value.out_idx) === asset.outIdx,
    cfg.ok ? `${asset.ticker} is open on the contract, with the catalogue's pool and indices` : `${asset.ticker} on the contract: ${cfg.why}`,
  );
  const who = addresses();
  if (who.sender) {
    const a = await horizonAccount(net, who.sender);
    if (!a.ok || !a.value) check(false, `the sender ${who.sender}: ${a.ok ? "no account" : a.why}`);
    else {
      const cash = classicBalance(a.value, USDC[which].code, USDC[which].issuer);
      const needsLine = !!asset.issuer && !hasTrustline(a.value, asset.code, asset.issuer);
      check(cash >= usd, `the sender holds ${cash} USDC (the send is ${usd})`);
      check(spendable(a.value) >= 1 + (needsLine ? BASE_RESERVE : 0), `the sender can spend ${spendable(a.value).toFixed(2)} XLM (a send costs about 0.3; ${needsLine ? `0.5 is set aside to hold ${asset.ticker} when it comes back` : `it already holds ${asset.ticker}`})`);
    }
    const p = await prepareFrom(net, d!.contractId, who.sender, asset, usd, keepBps);
    check(p.ok, p.ok ? `the send simulates: $${usd} keeping ${keepBps / 100}% becomes about ${units(BigInt(p.value.quote.keepOutRaw))} ${asset.ticker}, at the least ${units(BigInt(p.value.quote.minKeepOutRaw))}; fee ${xlm(p.value.prepared.feeStroops)}` : `the send: ${p.why}`);
  } else say(false, "no sender address: set SOWN_SMOKE_SENDER_PUBLIC (or the secret) to check it");
  if (who.sponsor) {
    const a = await horizonAccount(net, who.sponsor);
    if (!a.ok || !a.value) check(false, `Sown's servers ${who.sponsor}: ${a.ok ? "no account" : a.why}`);
    else check(spendable(a.value) >= 1, `Sown's servers can spend ${spendable(a.value).toFixed(2)} XLM (a wallet, its claim and two moves cost about 0.35)`);
  } else say(false, "no address for Sown's servers: set SOWN_SPONSOR_PUBLIC (or the secret) to check it");
  return problems;
}

// ── the run ───────────────────────────────────────────────────────────────────────────────────

async function run(asset: KeepAssetEntry) {
  const last = readEvidence();
  if (which === "mainnet" && !has("--again") && last?.steps.length && Date.now() - new Date(last.at).getTime() < 3_600_000) {
    throw new Error(`a mainnet smoke ran at ${last.at}; a second within the hour needs --again`);
  }
  const { sponsor, sender } = signers();
  const deps = relayDepsFor(sponsor);
  const evidence: Evidence = { network: which, contract: d!.contractId, at: new Date().toISOString(), usd, keepBps, asset: asset.ticker, sender: sender.publicKey(), steps: [], film: last?.film };
  let failures = 0;

  // 1. The send.
  const sent = await sendFromKey(net, d!.contractId, sender, asset, usd, keepBps);
  if (!sent.ok) throw new Error(`the send: ${sent.why}`);
  const e0 = await readEnvelope(net, d!.contractId, sent.value.id);
  if (!e0.ok) throw new Error(e0.why);
  evidence.steps.push({ name: `sent $${usd}, keeping ${keepBps / 100}% as ${asset.name}`, id: sent.value.id, tx: sent.value.hash, seconds: sent.value.seconds.toFixed(1), keep: units(e0.value.keepOut), least: units(BigInt(sent.value.quote.minKeepOutRaw)) });
  say(true, `sent envelope ${sent.value.id}: ${units(e0.value.cash)} USDC and ${units(e0.value.keepOut)} ${asset.ticker} (at the least ${units(BigInt(sent.value.quote.minKeepOutRaw))})  ${sent.value.hash}  ${sent.value.seconds.toFixed(1)} s`);

  // 2. A wallet made with one passkey, then the claim into it.
  const passkey = softPasskey(ORIGIN, RP_ID);
  const storage = new MemoryStorage();
  const kit = makeKit(storage, passkey);
  const t2 = Date.now();
  let wallet: string;
  try {
    const made = await kit.createWallet("Sown", "smoke", { autoSubmit: false });
    if (!made.relayerPayload) throw new Error("the kit returned no deployment payload");
    wallet = made.contractId;
    await saveWallet(wallet, passkey, storage);
    const claimed = await relayPasskeyClaim(
      deps,
      { id: sent.value.id.toString(), to: wallet, sig: signClaim(sent.value.secret, d!.contractId, sent.value.id, wallet).toString("hex"), func: made.relayerPayload.func, auth: made.relayerPayload.auth },
      "smoke",
    );
    if (!claimed.ok) throw new Error(claimed.why);
    await storage.update(made.credentialId, {
      contractId: wallet,
      deploymentStatus: "deployed",
      deploymentTransactionHash: claimed.value.deployTx,
      creationTransactionHash: claimed.value.deployTx,
      creationLedger: claimed.value.deployLedger,
    });
    await saveWallet(wallet, passkey, storage);
    const e1 = await readEnvelope(net, d!.contractId, sent.value.id);
    const chainSeconds = e1.ok ? LEDGER_SECONDS(e1.value.createdAt, e1.value.claimedAt) : null;
    evidence.wallet = wallet;
    evidence.steps.push({ name: "claimed into a wallet made with one Face ID (a software one), Sown's servers paid both", wallet, deployTx: claimed.value.deployTx, claimTx: claimed.value.claimTx, seconds: ((Date.now() - t2) / 1000).toFixed(1), prompts: passkey.prompts() });
    evidence.seconds = { send: Number(sent.value.seconds.toFixed(1)), claim: Number(((Date.now() - t2) / 1000).toFixed(1)), ...(chainSeconds !== null ? { sendToClaimOnTheLedger: chainSeconds } : {}) };
    say(true, `claimed into ${wallet} with ${passkey.prompts()} prompt: wallet ${claimed.value.deployTx}, claim ${claimed.value.claimTx}, ${((Date.now() - t2) / 1000).toFixed(1)} s`);
    const got = [await balanceOf(USDC[which].sac, wallet), await balanceOf(asset.sac, wallet)];
    const right = e1.ok && got[0] === e1.value.cash && got[1] === e1.value.keepOut;
    if (!right) failures += 1;
    say(right, `the wallet holds ${units(got[0]!)} USDC and ${units(got[1]!)} ${asset.ticker}, as the envelope said`);
  } catch (err) {
    // Nothing reached a wallet: the sender takes the envelope back, so the dollar is never stuck.
    say(false, `the claim: ${err instanceof Error ? err.message : String(err)}`);
    const back = await invokeAs(net, sender, d!.contractId, "refund", [nativeToScVal(sent.value.id, { type: "u64" }), Address.fromString(sender.publicKey()).toScVal()]);
    evidence.steps.push({ name: "the claim failed; the sender took the envelope back", tx: back.ok ? back.value.hash : null, why: back.ok ? "" : back.why });
    evidence.failures = failures + 1;
    writeEvidence(evidence);
    throw new Error(back.ok ? `claim failed; the envelope went back to the sender (${back.value.hash})` : `claim failed and the take-back failed too: ${back.why}`);
  }

  // 3. Both parts back to the sender.
  failures += await moveBack(sponsor, sender, wallet, evidence.steps);
  evidence.failures = failures;
  writeEvidence(evidence);
  console.log(`\n${failures === 0 ? "all green" : `${failures} FAILED`} · ${EVIDENCE.replace(`${ROOT}/`, "")}`);
  if (which === "mainnet" && failures === 0) {
    console.log("\nFor the README and the submission:");
    for (const s of evidence.steps) console.log(`  ${s.name}: ${String(s.claimTx ?? s.tx ?? "")}`);
  }
  return failures;
}

/** After the film's run (sent from a wallet in the browser, claimed on a phone): its hashes and timing, from the chain. */
async function record(idText: string) {
  if (!/^\d{1,19}$/.test(idText)) throw new Error("--record takes an envelope number");
  const id = BigInt(idText);
  const e = await readEnvelope(net, d!.contractId, id);
  if (!e.ok) throw new Error(e.why);
  if (e.value.state !== "claimed" || !e.value.claimedBy) throw new Error(`envelope ${id} is ${e.value.state}; record it once it is claimed`);
  const [sent, claimed, code] = await Promise.all([
    eventTx(net, d!.contractId, "sent", id, e.value.createdLedger),
    eventTx(net, d!.contractId, "claimed", id, e.value.claimedLedger),
    wasmHashOf(net, e.value.claimedBy),
  ]);
  const faceId = code.ok && code.value === KIT[which].accountWasmHash;
  const asset = keepAssetBySac(which, e.value.keepAsset);
  const film = {
    id: idText,
    recordedAt: new Date().toISOString(),
    amount: units(e.value.cash + e.value.keepIn, 2),
    keepBps: e.value.keepBps,
    asset: asset?.ticker ?? e.value.keepAsset,
    into: faceId ? "a wallet made with Face ID" : "a Stellar wallet",
    wallet: e.value.claimedBy,
    sendTx: sent?.hash ?? null,
    claimTx: claimed?.hash ?? null,
    secondsFromSendToClaim: LEDGER_SECONDS(e.value.createdAt, e.value.claimedAt),
  };
  const prior = readEvidence();
  const ev: Evidence = { ...(prior ?? { steps: [] }), network: which, contract: d!.contractId, at: prior?.at ?? film.recordedAt, film };
  writeEvidence(ev);
  say(!!sent && !!claimed, `envelope ${id}: $${film.amount}, ${film.keepBps / 100}% kept as ${film.asset}, into ${film.into}, ${film.secondsFromSendToClaim} s from send to claim on the ledger`);
  console.log(`  send  ${film.sendTx ?? "(the network no longer keeps this event; the receipt page shows it if it saw it)"}`);
  console.log(`  claim ${film.claimTx ?? "(the network no longer keeps this event; the receipt page shows it if it saw it)"}`);
  console.log(`  written to ${EVIDENCE.replace(`${ROOT}/`, "")}`);
}

async function main() {
  if (!d) throw new Error(`Sown is not deployed on ${which}: run npm run contract:deploy:${which} first.`);
  const key = arg("--asset") ?? keepAssets(which)[0]!.key;
  const asset = keepAssetByKey(which, key);
  if (!asset) throw new Error(`no keep asset "${key}" on ${which}`);
  if (!Number.isFinite(usd) || usd < 1) throw new Error("--usd is at least 1");
  console.log(`${which} · contract ${d.contractId} · $${usd} keeping ${keepBps / 100}% as ${asset.fullName}\n`);

  if (arg("--record")) return record(arg("--record")!);
  if (arg("--recover")) {
    const { sponsor, sender } = signers();
    const steps: Step[] = [];
    const failures = await moveBack(sponsor, sender, arg("--recover")!, steps);
    process.exit(failures === 0 ? 0 : 1);
  }
  const problems = await checks(asset);
  if (has("--dry")) {
    console.log(`\n${problems === 0 ? "ready: nothing was sent" : `${problems} to fix before a real run; nothing was sent`}`);
    process.exit(problems === 0 ? 0 : 1);
  }
  if (problems > 0) throw new Error(`${problems} check(s) failed; nothing was sent`);
  console.log("");
  const failures = await run(asset);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
