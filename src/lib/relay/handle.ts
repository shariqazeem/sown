import { Account, Address, Asset, Keypair, Operation, StrKey, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";
import type { CashAsset, KeepAssetEntry } from "@/lib/assets/catalogue";
import { readEnvelope } from "@/lib/envelope/read";
import type { Envelope } from "@/lib/envelope/types";
import { type Outcome, held, ok } from "@/lib/outcome";
import type { KitConfig } from "@/lib/passkey/config";
import { hasTrustline, horizonAccount } from "@/lib/stellar/horizon";
import { gated } from "@/lib/stellar/limiter";
import type { NetworkConfig } from "@/lib/stellar/network";
import { INSTRUCTION_LEEWAY, rpcServer, sendAndWait, simulationReason } from "@/lib/stellar/soroban";
import { checkSponsorBalance } from "./alert";
import { claimHostFunction, inspectWalletDeploy, parseClaim } from "./inspect";
import { allowIp, lock, unlock } from "./limit";
import { submitFuncAuth } from "./submit";
import { type TrustNeed, buildTrustlineTx, inspectSignedTrustlineTx } from "./trustlines";

/**
 * SOWN'S SERVERS, PAYING FOR WHAT A RECIPIENT CANNOT. Three requests, each checked against
 * the chain and an exact shape before the sponsor's key signs anything:
 *
 *   claim       an envelope into a wallet that exists (shape 2)
 *   passkey     a new passkey wallet, then the claim into it (shapes 1 + 2)
 *   trustlines  a classic wallet made ready to hold USDC and the keep (shape 3), in two
 *               steps: "prepare" returns the transaction to sign, "submit" takes it back
 *
 * Every refusal says why in a sentence and moves nothing.
 */
export type RelayDeps = {
  readonly net: NetworkConfig;
  readonly contractId: string;
  readonly sponsor: Keypair;
  readonly kit: KitConfig;
  readonly usdc: CashAsset;
  readonly keepAssets: readonly KeepAssetEntry[];
};

export type ClaimDone = { readonly claimTx: string; readonly ledger: number; readonly to: string; readonly deployTx?: string };

async function openEnvelope(deps: RelayDeps, id: bigint): Promise<Outcome<Envelope>> {
  const e = await readEnvelope(deps.net, deps.contractId, id);
  if (!e.ok) return e;
  if (e.value.state !== "open") return held(e.value.state === "claimed" ? "This envelope was already claimed." : "This envelope went back to the sender.");
  return e;
}

/** Simulate the claim first: a wrong link fails here, before anything is paid. */
async function simulateClaim(deps: RelayDeps, id: bigint, to: string, sig: Buffer): Promise<Outcome<true>> {
  const server = rpcServer(deps.net);
  const probe = new TransactionBuilder(new Account(deps.sponsor.publicKey(), "0"), { fee: "1000000", networkPassphrase: deps.net.passphrase })
    .addOperation(Operation.invokeHostFunction({ func: claimHostFunction(deps.contractId, { id, to, sig }), auth: [] }))
    .setTimeout(120)
    .build();
  try {
    const sim = await gated(deps.net.rpcUrl, () => server.simulateTransaction(probe, { cpuInstructions: INSTRUCTION_LEEWAY }));
    if (rpc.Api.isSimulationError(sim)) {
      const r = simulationReason(sim.error);
      return held(/#2\b/.test(r) ? "This envelope was already claimed or returned." : "This link does not open this envelope. Ask the sender to share it again.");
    }
  } catch (err) {
    return held(`The network did not answer (${err instanceof Error ? err.message : String(err)}). Nothing moved.`);
  }
  return ok(true);
}

async function submitClaim(deps: RelayDeps, id: bigint, to: string, sig: Buffer): Promise<Outcome<{ hash: string; ledger: number }>> {
  const landed = await submitFuncAuth(deps.net, deps.sponsor, claimHostFunction(deps.contractId, { id, to, sig }), []);
  void checkSponsorBalance(deps.net, deps.sponsor.publicKey());
  if (!landed.ok) return held(`${landed.why.replace(/ Nothing moved\.$/, "")} Your envelope is still waiting.`);
  return ok({ hash: landed.value.hash, ledger: landed.value.ledger });
}

export async function relayClaim(deps: RelayDeps, body: Record<string, unknown>, ip: string): Promise<Outcome<ClaimDone>> {
  if (!allowIp(ip)) return held("Too many requests from here. Wait a few minutes; nothing moved.");
  const c = parseClaim(body);
  if (!c.ok) return c;
  const key = `claim:${c.value.id}`;
  if (!lock(key)) return held("This envelope is already being claimed. Wait a moment.");
  try {
    const e = await openEnvelope(deps, c.value.id);
    if (!e.ok) return e;
    if (StrKey.isValidEd25519PublicKey(c.value.to)) {
      const ready = await classicReady(deps, c.value.to, e.value);
      if (!ready.ok) return ready;
    }
    const sim = await simulateClaim(deps, c.value.id, c.value.to, c.value.sig);
    if (!sim.ok) return sim;
    const done = await submitClaim(deps, c.value.id, c.value.to, c.value.sig);
    if (!done.ok) return done;
    return ok({ claimTx: done.value.hash, ledger: done.value.ledger, to: c.value.to });
  } finally {
    unlock(key);
  }
}

/** A new passkey wallet, then the claim into it: one Face ID on the phone, two transactions paid here. */
export async function relayPasskeyClaim(deps: RelayDeps, body: Record<string, unknown>, ip: string): Promise<Outcome<ClaimDone>> {
  if (!allowIp(ip)) return held("Too many requests from here. Wait a few minutes; nothing moved.");
  const c = parseClaim(body);
  if (!c.ok) return c;
  if (!StrKey.isValidContract(c.value.to)) return held("A passkey wallet's address starts with C.");
  const deploy = inspectWalletDeploy(deps.kit, deps.net.passphrase, body.func, body.auth, c.value.to);
  if (!deploy.ok) return deploy;
  const key = `claim:${c.value.id}`;
  if (!lock(key)) return held("This envelope is already being claimed. Wait a moment.");
  try {
    const e = await openEnvelope(deps, c.value.id);
    if (!e.ok) return e;
    // The link must open the envelope into exactly this wallet before a wallet is paid for.
    const sim = await simulateClaim(deps, c.value.id, c.value.to, c.value.sig);
    if (!sim.ok) return sim;
    let deployTx: string | undefined;
    if (!(await contractExists(deps.net, c.value.to))) {
      const made = await submitFuncAuth(deps.net, deps.sponsor, deploy.value.func, deploy.value.auth);
      if (!made.ok) return held(`Your wallet could not be made (${made.why.replace(/ Nothing moved\.$/, "")}). Nothing moved; your envelope is still waiting.`);
      deployTx = made.value.hash;
    }
    const done = await submitClaim(deps, c.value.id, c.value.to, c.value.sig);
    if (!done.ok) return held(`Your wallet is ready, but the claim did not go through: ${done.why}`);
    return ok({ claimTx: done.value.hash, ledger: done.value.ledger, to: c.value.to, deployTx });
  } finally {
    unlock(key);
  }
}

async function contractExists(net: NetworkConfig, id: string): Promise<boolean> {
  const key = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({ contract: Address.fromString(id).toScAddress(), key: xdr.ScVal.scvLedgerKeyContractInstance(), durability: xdr.ContractDataDurability.persistent() }),
  );
  try {
    const r = await gated(net.rpcUrl, () => rpcServer(net).getLedgerEntries(key));
    return r.entries.length > 0;
  } catch {
    return false;
  }
}

/** What a classic wallet still needs before it can receive this envelope. */
export async function trustNeed(deps: RelayDeps, account: string, e: Envelope): Promise<Outcome<TrustNeed>> {
  const acct = await horizonAccount(deps.net, account);
  if (!acct.ok) return acct;
  const wanted: Asset[] = [new Asset(deps.usdc.code, deps.usdc.issuer)];
  const keep = deps.keepAssets.find((a) => a.sac === e.keepAsset);
  if (keep && keep.issuer && e.keepOut > 0n) wanted.push(new Asset(keep.code, keep.issuer));
  if (!acct.value) return ok({ exists: false, assets: wanted });
  const a = acct.value;
  return ok({ exists: true, assets: wanted.filter((w) => !hasTrustline(a, w.getCode(), w.getIssuer())) });
}

async function classicReady(deps: RelayDeps, account: string, e: Envelope): Promise<Outcome<true>> {
  const need = await trustNeed(deps, account, e);
  if (!need.ok) return need;
  if (!need.value.exists || need.value.assets.length > 0) return held("This wallet is not ready to hold these yet. Approve the first step in your wallet, then claim.");
  return ok(true);
}

export type TrustStep = { readonly ready: true } | { readonly xdr: string } | { readonly tx: string };

export async function relayTrustlines(deps: RelayDeps, body: Record<string, unknown>, ip: string): Promise<Outcome<TrustStep>> {
  if (!allowIp(ip)) return held("Too many requests from here. Wait a few minutes; nothing moved.");
  const account = typeof body.account === "string" ? body.account.trim() : "";
  if (!StrKey.isValidEd25519PublicKey(account)) return held("That is not a classic Stellar wallet address.");
  const idText = typeof body.id === "string" || typeof body.id === "number" ? String(body.id) : "";
  if (!/^\d{1,19}$/.test(idText)) return held("That is not an envelope number.");
  const e = await openEnvelope(deps, BigInt(idText));
  if (!e.ok) return e;
  const need = await trustNeed(deps, account, e.value);
  if (!need.ok) return need;
  if (need.value.exists && need.value.assets.length === 0) return ok({ ready: true });

  const server = rpcServer(deps.net);
  if (typeof body.signed !== "string") {
    // Step 1: prepare. The sponsor's next sequence, the exact operations, nothing signed here.
    const acct = await gated(deps.net.rpcUrl, () => server.getAccount(deps.sponsor.publicKey()));
    const tx = buildTrustlineTx(deps.net.passphrase, new Account(acct.accountId(), acct.sequenceNumber()), account, need.value);
    return ok({ xdr: tx.toXDR() });
  }
  // Step 2: the wallet signed it; accept it only if it is exactly that transaction.
  const key = `trust:${account}`;
  if (!lock(key)) return held("This wallet is already being prepared. Wait a moment.");
  try {
    const tx = inspectSignedTrustlineTx(deps.net.passphrase, body.signed, deps.sponsor.publicKey(), account, need.value);
    if (!tx.ok) return tx;
    tx.value.sign(deps.sponsor);
    const landed = await sendAndWait(deps.net, tx.value);
    void checkSponsorBalance(deps.net, deps.sponsor.publicKey());
    if (!landed.ok) {
      return held(/bad_?seq|txBadSeq/i.test(landed.why) ? "The network moved on while you approved. Approve once more." : landed.why);
    }
    return ok({ tx: landed.value.hash });
  } finally {
    unlock(key);
  }
}
