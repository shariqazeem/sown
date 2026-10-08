/**
 * PREFLIGHT — what a mainnet bring-up and a hundred sponsored claims cost, read from the chain.
 * Read-only: it simulates on mainnet and reads testnet; it signs and sends nothing.
 *
 *   npm run preflight
 *   SOWN_ADMIN_PUBLIC=G… SOWN_SPONSOR_PUBLIC=G… npm run preflight    # and say what is missing
 *
 * Two kinds of figure, each labelled:
 *  - simulated on mainnet now: the contract code's upload, one Face ID wallet's deployment
 *  - repriced: the testnet battery's own transactions, entry by entry (size × days of life),
 *    at mainnet's rent rate and with mainnet's 120-day minimum for new entries. The model is
 *    first checked against the rent testnet actually charged for the same transactions.
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Account, Address, Operation, TransactionBuilder, nativeToScVal, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import battery from "../deployments/testnet-battery.json";
import testnet from "../deployments/testnet.json";
import fixtures from "../src/lib/relay/fixtures/testnet.json";
import { KIT } from "@/lib/passkey/config";
import { baseNetwork } from "@/lib/stellar/network";
import { INSTRUCTION_LEEWAY, simulate } from "@/lib/stellar/soroban";
import { ROOT } from "./lib/keys";
import { type Rent, readRent } from "./lib/rent";

const mainnet = baseNetwork("mainnet");
const test = baseNetwork("testnet");
const STROOP = 1e7;
const xlm = (stroops: number) => `${(stroops / STROOP).toFixed(4)} XLM`;
// Any funded mainnet account can be the source of a simulation; Circle's USDC issuer exists.
const SIM_SOURCE = process.env.SOWN_ADMIN_PUBLIC ?? "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

/** One entry's rent-relevant change, as the host computes rent (soroban-env-host fees.rs). */
type Change = { oldSize: number; newSize: number; oldLiveUntil: number; newLiveUntil: number; created: boolean; temporary: boolean };
type Measured = { name: string; hash: string; ledger: number; feeCharged: number; nonRefundable: number; rentCharged: number; changes: Change[] };

const keyHex = (k: xdr.LedgerKey) => createHash("sha256").update(k.toXDR()).digest("hex");

function dataKey(e: xdr.LedgerEntry): xdr.LedgerKey | null {
  const d = e.data();
  if (d.switch().name === "contractData") return xdr.LedgerKey.contractData(new xdr.LedgerKeyContractData({ contract: d.contractData().contract(), key: d.contractData().key(), durability: d.contractData().durability() }));
  return null; // code is rented on its in-memory size, which the meta does not carry: simulated instead
}

/** Every contract-data entry the transaction wrote or extended: sizes and lives, before and after. */
function changesOf(meta: xdr.TransactionMeta, ledger: number): Change[] {
  const sw = meta.switch() as unknown as number;
  const ops = sw === 4 ? meta.v4().operations() : sw === 3 ? meta.v3().operations() : [];
  const before = new Map<string, { size?: number; ttl?: number }>();
  const after = new Map<string, { size?: number; ttl?: number; created?: boolean; temporary?: boolean }>();
  for (const c of ops.flatMap((o) => o.changes())) {
    const kind = c.switch().name;
    const e: xdr.LedgerEntry | null = kind === "ledgerEntryCreated" ? c.created() : kind === "ledgerEntryUpdated" ? c.updated() : kind === "ledgerEntryState" ? c.state() : null;
    if (!e) continue;
    const d = e.data();
    const isState = kind === "ledgerEntryState";
    if (d.switch().name === "ttl") {
      const k = Buffer.from(d.ttl().keyHash()).toString("hex");
      const m = isState ? before : after;
      m.set(k, { ...(m.get(k) ?? {}), ttl: d.ttl().liveUntilLedgerSeq() });
      continue;
    }
    const key = dataKey(e);
    if (!key) continue;
    const k = keyHex(key);
    if (isState) before.set(k, { ...(before.get(k) ?? {}), size: e.toXDR().length });
    else after.set(k, { ...(after.get(k) ?? {}), size: e.toXDR().length, created: kind === "ledgerEntryCreated", temporary: d.contractData().durability().name === "temporary" });
  }
  const out: Change[] = [];
  for (const [k, a] of after) {
    if (a.size === undefined) continue; // a TTL-only change to an entry the meta does not size
    const b = before.get(k) ?? {};
    const created = a.created || b.size === undefined;
    const oldLiveUntil = created ? ledger - 1 : (b.ttl ?? a.ttl ?? ledger - 1);
    out.push({ oldSize: created ? 0 : (b.size ?? a.size), newSize: a.size, oldLiveUntil, newLiveUntil: a.ttl ?? oldLiveUntil, created, temporary: !!a.temporary });
  }
  return out;
}

/** Rent as the host computes it, with new entries given at least `minNewLedgers` of life. */
function rentFor(cs: Change[], rent: Rent, ledger: number, minNewLedgers = 0): number {
  return cs.reduce((sum, c) => {
    const denom = Number(c.temporary ? rent.tempDenominator : rent.denominator);
    const fee = (bytes: number, ledgers: number) => Math.ceil((bytes * Number(rent.feePer1Kb) * ledgers) / (1024 * denom));
    // A new persistent entry lives at least the network's minimum; a temporary one as long as it asked.
    const newLiveUntil = c.created && !c.temporary ? Math.max(c.newLiveUntil, ledger + minNewLedgers - 1) : c.newLiveUntil;
    let r = 0;
    if (c.oldLiveUntil < newLiveUntil) r += fee(c.newSize, newLiveUntil - c.oldLiveUntil);
    const prepaid = c.oldLiveUntil - ledger + 1;
    if (prepaid > 0 && c.newSize > c.oldSize) r += fee(c.newSize - c.oldSize, prepaid);
    return sum + r;
  }, 0);
}

async function measured(name: string, hash: string): Promise<Measured | null> {
  const got = await new rpc.Server(test.rpcUrl).getTransaction(hash);
  if (got.status !== rpc.Api.GetTransactionStatus.SUCCESS) return null;
  const meta = got.resultMetaXdr;
  let nonRefundable = 0;
  let rentCharged = 0;
  try {
    const sm = (meta.switch() as unknown as number) === 4 ? meta.v4().sorobanMeta() : meta.v3().sorobanMeta();
    const v1 = sm?.ext().v1();
    nonRefundable = Number(v1?.totalNonRefundableResourceFeeCharged().toString() ?? 0);
    rentCharged = Number(v1?.rentFeeCharged().toString() ?? 0);
  } catch {
    // A classic transaction has no Soroban meta.
  }
  return { name, hash, ledger: got.ledger, feeCharged: Number(got.resultXdr.feeCharged().toString()), nonRefundable, rentCharged, changes: changesOf(meta, got.ledger) };
}

async function simulateOp(op: xdr.Operation): Promise<number | string> {
  const server = new rpc.Server(mainnet.rpcUrl);
  const tx = new TransactionBuilder(new Account(SIM_SOURCE, "0"), { fee: "100", networkPassphrase: mainnet.passphrase }).addOperation(op).setTimeout(60).build();
  const sim = await server.simulateTransaction(tx, { cpuInstructions: INSTRUCTION_LEEWAY });
  if (rpc.Api.isSimulationError(sim)) return sim.error.split("\n")[0]!.slice(0, 140);
  return Number(sim.minResourceFee) + 100;
}

/** The kit's deployment of one Face ID wallet, for mainnet: the recorded testnet request, mainnet's verifier, a fresh salt and key. */
function mainnetWalletDeploy(): xdr.Operation {
  const func = xdr.HostFunction.fromXDR(fixtures.deploy.func, "base64");
  const c = func.createContractV2();
  const pre = c.contractIdPreimage().fromAddress();
  const [signers, policies] = c.constructorArgs() as [xdr.ScVal, xdr.ScVal];
  const parts = signers.vec()![0]!.vec()!;
  const key = Buffer.concat([Buffer.from([4]), randomBytes(64), randomBytes(16)]);
  const signer = xdr.ScVal.scvVec([parts[0]!, Address.fromString(KIT.mainnet.webauthnVerifier).toScVal(), xdr.ScVal.scvBytes(key)]);
  const fresh = new xdr.CreateContractArgsV2({
    contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(new xdr.ContractIdPreimageFromAddress({ address: pre.address(), salt: randomBytes(32) })),
    executable: c.executable(),
    constructorArgs: [xdr.ScVal.scvVec([signer]), policies],
  });
  return Operation.invokeHostFunction({ func: xdr.HostFunction.hostFunctionTypeCreateContractV2(fresh), auth: [] });
}

async function xlmUsd(): Promise<number | null> {
  const r = await simulate(mainnet, "CA6PUJLBYKZKUEKLZJMKBZLEKP2OTHANDEOWSFF44FTSYLKQPIICCJBE", "estimate_swap", [nativeToScVal(0, { type: "u32" }), nativeToScVal(1, { type: "u32" }), nativeToScVal(10_000_000n, { type: "u128" })]);
  return r.ok && r.value.retval ? Number(scValToNative(r.value.retval) as bigint) / STROOP : null;
}

async function balance(id: string | undefined): Promise<number | null> {
  if (!id) return null;
  const r = await fetch(`${mainnet.horizonUrl}/accounts/${id}`);
  if (!r.ok) return 0;
  const a = (await r.json()) as { balances: Array<{ asset_type: string; balance: string }> };
  return Number(a.balances.find((b) => b.asset_type === "native")?.balance ?? 0);
}

async function main() {
  const [main_, testRent, price] = await Promise.all([readRent(mainnet), readRent(test), xlmUsd()]);
  const usd = (stroops: number) => (price ? ` ≈ $${((stroops / STROOP) * price).toFixed(2)}` : "");
  console.log(`Mainnet, read ${new Date().toISOString()}`);
  console.log(`  rent ${main_.feePer1Kb} stroops per KB (state ${(Number(main_.stateBytes) / 1e9).toFixed(2)} GB of ${(Number(main_.targetBytes) / 1e9).toFixed(1)} GB), ${main_.xlmPerKbDay.toFixed(5)} XLM per KB per day`);
  console.log(`  new entries live at least ${Math.round(main_.minPersistentTtl / 17_280)} days; the most is ${Math.round(main_.maxEntryTtl / 17_280)} days; XLM ${price ? `$${price.toFixed(4)}` : "unpriced"} on Aquarius`);
  console.log(`Testnet: rent ${testRent.feePer1Kb} stroops per KB, new entries at least ${Math.round(testRent.minPersistentTtl / 17_280)} days\n`);

  // 1. Simulated on mainnet now.
  const wasm = readFileSync(join(ROOT, "artifacts", "sown.wasm"));
  const upload = await simulateOp(Operation.uploadContractWasm({ wasm }));
  const wallet = await simulateOp(mainnetWalletDeploy());
  console.log("Simulated on mainnet now");
  console.log(`  upload the Sown contract code (${wasm.length.toLocaleString("en-US")} bytes)   ${typeof upload === "number" ? xlm(upload) + usd(upload) : `could not simulate: ${upload}`}   the admin pays`);
  console.log(`  deploy one Face ID wallet                       ${typeof wallet === "number" ? xlm(wallet) + usd(wallet) : `could not simulate: ${wallet}`}   Sown's servers pay\n`);

  // 2. Repriced from testnet's own transactions.
  const steps = (battery as { steps: Array<{ name: string; tx?: string; claimTx?: string; deployTx?: string; refundTx?: string }> }).steps;
  const find = (re: RegExp, k: "tx" | "claimTx" | "deployTx" | "refundTx" = "tx") => steps.find((s) => re.test(s.name))?.[k];
  const kinds: Array<[string, string | undefined, string]> = [
    ["create the contract (constructor)", (testnet as { deployTx: string }).deployTx, "the admin"],
    ["register one keep asset (set_asset)", (testnet as { assets: Array<{ tx: string }> }).assets[0]?.tx, "the admin"],
    ["one send (the envelope kept ~180 days)", find(/^send 10 USDC/), "the sender"],
    ["one claim into a Face ID wallet", find(/one Face ID/, "claimTx"), "Sown's servers"],
    ["one claim into a classic wallet", find(/^claimed into the classic wallet/), "Sown's servers"],
    ["one move out of a Face ID wallet", find(/^moved 1 XLM/), "Sown's servers"],
    ["one take-it-back", find(/took it back/, "refundTx"), "the sender"],
  ];
  const rows: Array<{ name: string; who: string; mainnetStroops: number; how: "modelled" | "scaled" }> = [];
  const ratio = Number(main_.feePer1Kb) / Number(testRent.feePer1Kb);
  let checked = 0;
  let worst = 0;
  const scaled: string[] = [];
  for (const [name, hash, who] of kinds) {
    if (!hash) continue;
    const m = await measured(name, hash);
    if (!m) {
      console.log(`  ${name}: testnet no longer keeps ${hash.slice(0, 8)}…; run the battery again`);
      continue;
    }
    const model = rentFor(m.changes, testRent, m.ledger);
    // When the entries the meta sizes explain less than half the rent (a contract extending its own
    // instance and code shows only as a TTL change), price testnet's actual rent at mainnet's rate.
    const modelled = m.rentCharged === 0 || model >= m.rentCharged / 2;
    if (modelled && m.rentCharged > 0 && !/set_asset/.test(name)) {
      checked += 1;
      worst = Math.max(worst, Math.abs(model - m.rentCharged) / m.rentCharged);
    }
    if (!modelled) scaled.push(name);
    if (process.argv.includes("--verbose")) console.log(`  check ${name}: model ${model} vs charged ${m.rentCharged}${modelled ? "" : " (scaled instead)"}`);
    const rent = modelled ? rentFor(m.changes, main_, m.ledger, main_.minPersistentTtl) : Math.ceil(m.rentCharged * ratio);
    rows.push({ name, who, mainnetStroops: m.nonRefundable + rent + 100, how: modelled ? "modelled" : "scaled" });
  }
  console.log(`Repriced from the testnet battery's own transactions: entry by entry where the model matches testnet (within ${(worst * 100).toFixed(1)}% on ${checked}); scaled by the rent rates for ${scaled.length ? scaled.join(", ") : "none"}`);
  for (const r of rows) console.log(`  ${r.name.padEnd(46)} ${xlm(r.mainnetStroops).padStart(12)}${usd(r.mainnetStroops)}   ${r.who} pays${r.how === "scaled" ? "   (scaled)" : ""}`);
  const classicReady = 2 * 5_000_000 + 2 * 5_000_000 + 4 * 1_000;
  console.log(`  ${"one classic wallet made ready (account, 2 lines)".padEnd(46)} ${xlm(classicReady).padStart(12)} locked, returned when the wallet lets go   Sown's servers\n`);

  // Keeping the contract alive: testnet's own extension of instance and code, per day, at mainnet's rate.
  const extendTx = (testnet as { extendTx?: string | null }).extendTx;
  let alivePer30 = 0;
  if (extendTx) {
    const got = await new rpc.Server(test.rpcUrl).getTransaction(extendTx);
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      const meta = got.resultMetaXdr;
      const sm = (meta.switch() as unknown as number) === 4 ? meta.v4().sorobanMeta() : meta.v3().sorobanMeta();
      const rentCharged = Number(sm?.ext().v1()?.rentFeeCharged().toString() ?? 0);
      const ops = (meta.switch() as unknown as number) === 4 ? meta.v4().operations() : meta.v3().operations();
      const ttls = ops.flatMap((o) => o.changes()).filter((c) => c.switch().name === "ledgerEntryUpdated" && c.updated().data().switch().name === "ttl");
      const states = ops.flatMap((o) => o.changes()).filter((c) => c.switch().name === "ledgerEntryState" && c.state().data().switch().name === "ttl");
      const extendedBy = ttls.length && states.length ? ttls[0]!.updated().data().ttl().liveUntilLedgerSeq() - states[0]!.state().data().ttl().liveUntilLedgerSeq() : 0;
      if (extendedBy > 0) alivePer30 = Math.ceil((rentCharged / extendedBy) * 30 * 17_280 * ratio);
    }
  }
  if (alivePer30) console.log(`  ${"keep the contract alive, per 30 days after its first 120".padEnd(46)} ${xlm(alivePer30).padStart(12)}${usd(alivePer30)}   whoever runs Sown pays (scripts/keep-alive.ts)\n`);

  // 3. The budget.
  const get = (re: RegExp) => rows.find((r) => re.test(r.name))?.mainnetStroops ?? 0;
  const adminNeeds = (typeof upload === "number" ? upload : 0) + get(/create the contract/) + 3 * get(/set_asset/) + 10_000_000;
  const perFaceId = (typeof wallet === "number" ? wallet : 0) + get(/claim into a Face ID/);
  const perClassic = get(/claim into a classic/) + classicReady;
  console.log("Budget");
  console.log(`  the admin: upload, create, three assets, and the account's 1 XLM minimum   ${xlm(adminNeeds)}${usd(adminNeeds)}`);
  console.log(`  Sown's servers, 100 Face ID claims (wallet + claim each)                   ${xlm(100 * perFaceId)}${usd(100 * perFaceId)}`);
  console.log(`  Sown's servers, 100 classic claims (2 XLM locked each, returnable)          ${xlm(100 * perClassic)}`);
  console.log(`  a sender, per send                                                          ${xlm(get(/one send/))}${usd(get(/one send/))}`);

  // 4. What is missing, when the accounts are named.
  const [adminBal, sponsorBal] = await Promise.all([balance(process.env.SOWN_ADMIN_PUBLIC), balance(process.env.SOWN_SPONSOR_PUBLIC)]);
  if (adminBal !== null || sponsorBal !== null) console.log("\nAccounts");
  if (adminBal !== null) console.log(`  admin ${process.env.SOWN_ADMIN_PUBLIC}: ${adminBal} XLM — ${adminBal * STROOP >= adminNeeds ? "enough" : `needs ${xlm(adminNeeds - adminBal * STROOP)} more`}`);
  if (sponsorBal !== null) console.log(`  Sown's servers ${process.env.SOWN_SPONSOR_PUBLIC}: ${sponsorBal} XLM — covers about ${Math.floor((sponsorBal * STROOP - 10_000_000) / Math.max(1, perFaceId))} Face ID claims`);
}

main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
