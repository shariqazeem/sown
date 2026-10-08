"use client";

import { Account, Address, Asset, Keypair, Operation, TransactionBuilder, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { USDC, keepAssets } from "@/lib/assets/catalogue";
import { network, networkName } from "@/lib/stellar/network";
import { buildCall, rpcServer, sendAndWait, simulate } from "@/lib/stellar/soroban";

/**
 * A TEST WALLET IN THIS BROWSER — testnet only, and only when `NEXT_PUBLIC_SOWN_TEST_WALLET=1`.
 *
 * It lets anyone try a send on testnet without installing a wallet, and it lets the build agent
 * drive the real send card, confirm sheet and claim page in a browser that cannot hold an
 * extension. It is a Stellar Wallets Kit module like Freighter's, so it walks the same path:
 * connect, sign, submit. Its key lives in this browser's storage, which is exactly why it never
 * exists on mainnet.
 *
 * On first connect it funds itself: Friendbot's XLM, a line for Aquarius's test USDC, and about
 * 34 test USDC bought with 3,000 test XLM through the same pool the keep uses.
 */
const KEY = "sown:testnet:test-wallet";
const ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#e8edfb"/><path d="M6 12h12M12 6v12" stroke="#2b4acb" stroke-width="2.2" stroke-linecap="round"/></svg>');

export function testWalletEnabled(): boolean {
  return networkName() === "testnet" && process.env.NEXT_PUBLIC_SOWN_TEST_WALLET === "1";
}

function keypair(): Keypair {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return Keypair.fromSecret(s);
  } catch {
    // A private window gets a new wallet each time.
  }
  const k = Keypair.random();
  try {
    localStorage.setItem(KEY, k.secret());
  } catch {
    // As above.
  }
  return k;
}

async function horizonAccount(id: string): Promise<{ balances: Array<{ asset_code?: string; asset_issuer?: string; balance: string }> } | null> {
  const r = await fetch(`${network().horizonUrl}/accounts/${id}`, { cache: "no-store" });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Horizon answered ${r.status}`);
  return r.json();
}

async function fund(k: Keypair): Promise<void> {
  const net = network();
  const usdc = USDC.testnet;
  let acct = await horizonAccount(k.publicKey());
  if (!acct) {
    const r = await fetch(`${net.friendbot}?addr=${k.publicKey()}`);
    if (!r.ok) throw new Error("Friendbot did not fund the test wallet.");
    acct = await horizonAccount(k.publicKey());
  }
  const line = acct?.balances.find((b) => b.asset_code === usdc.code && b.asset_issuer === usdc.issuer);
  const server = rpcServer(net);
  if (!line) {
    const a = await server.getAccount(k.publicKey());
    const tx = new TransactionBuilder(a, { fee: "1000", networkPassphrase: net.passphrase }).addOperation(Operation.changeTrust({ asset: new Asset(usdc.code, usdc.issuer) })).setTimeout(60).build();
    tx.sign(k);
    const t = await sendAndWait(net, tx);
    if (!t.ok) throw new Error(t.why);
  }
  if (Number(line?.balance ?? 0) >= 10) return;
  try {
    await topUp(k);
  } catch (err) {
    // A claim needs no USDC, and the send card says what the wallet holds: never block on this.
    console.warn("The test wallet could not buy test USDC just now:", err);
  }
}

async function topUp(k: Keypair): Promise<void> {
  const net = network();
  const server = rpcServer(net);
  // Buy test USDC with test XLM through the testnet pool (XLM → USDC is outIdx → inIdx).
  const pool = keepAssets("testnet")[0]!;
  const xlmIn = 3_000_0000000n;
  const est = await simulate(net, pool.pool, "estimate_swap", [nativeToScVal(pool.outIdx, { type: "u32" }), nativeToScVal(pool.inIdx, { type: "u32" }), nativeToScVal(xlmIn, { type: "u128" })]);
  if (!est.ok || !est.value.retval) throw new Error("Aquarius did not quote test USDC.");
  const out = BigInt(scValToNative(est.value.retval) as bigint);
  const a = await server.getAccount(k.publicKey());
  const call = buildCall(net, new Account(a.accountId(), a.sequenceNumber()), pool.pool, "swap", [
    Address.fromString(k.publicKey()).toScVal(),
    nativeToScVal(pool.outIdx, { type: "u32" }),
    nativeToScVal(pool.inIdx, { type: "u32" }),
    nativeToScVal(xlmIn, { type: "u128" }),
    nativeToScVal((out * 97n) / 100n, { type: "u128" }),
  ]);
  const prepared = await server.prepareTransaction(call);
  prepared.sign(k);
  const s = await sendAndWait(net, prepared);
  if (!s.ok) throw new Error(s.why);
}

/** The module the Wallets Kit lists beside Freighter, xBull, LOBSTR, Hana and Albedo. */
export class TestWalletModule {
  moduleType = "HOT_WALLET" as never;
  productId = "sown-test-wallet";
  productName = "Test wallet in this browser (testnet)";
  productUrl = "https://developers.stellar.org/docs/learn/fundamentals/networks#testnet";
  productIcon = ICON;
  private funded = false;

  async isAvailable(): Promise<boolean> {
    return testWalletEnabled();
  }

  async getAddress(): Promise<{ address: string }> {
    const k = keypair();
    if (!this.funded) {
      await fund(k);
      this.funded = true;
    }
    return { address: k.publicKey() };
  }

  async signTransaction(xdr: string, opts?: { networkPassphrase?: string; address?: string }): Promise<{ signedTxXdr: string; signerAddress?: string }> {
    const k = keypair();
    const net = network();
    if ((opts?.networkPassphrase ?? net.passphrase) !== net.passphrase) throw new Error("The test wallet signs only on testnet.");
    const tx = TransactionBuilder.fromXDR(xdr, net.passphrase);
    tx.sign(k);
    return { signedTxXdr: tx.toXDR(), signerAddress: k.publicKey() };
  }

  async signAuthEntry(): Promise<{ signedAuthEntry: string; signerAddress?: string }> {
    throw new Error("The test wallet does not sign authorisation entries.");
  }

  async signMessage(): Promise<{ signedMessage: string; signerAddress?: string }> {
    throw new Error("The test wallet does not sign messages.");
  }

  async getNetwork(): Promise<{ network: string; networkPassphrase: string }> {
    return { network: "testnet", networkPassphrase: network().passphrase };
  }
}
