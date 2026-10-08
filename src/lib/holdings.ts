import "server-only";
import { Address, StrKey, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { USDC, keepAssets } from "@/lib/assets/catalogue";
import { type Outcome, ok } from "@/lib/outcome";
import { hasTrustline, horizonAccount } from "@/lib/stellar/horizon";
import { type NetworkName, network } from "@/lib/stellar/network";
import { simulate } from "@/lib/stellar/soroban";

/**
 * WHAT AN ADDRESS HOLDS, READ FROM THE CHAIN: USDC, and each keep asset with what it would
 * fetch on Aquarius right now (the pool's own `estimate_swap` back to USDC). A G-address's
 * trustlines come from Horizon; a passkey wallet needs none.
 */
export type Holding = {
  readonly key: string;
  readonly ticker: string;
  readonly name: string;
  readonly fullName: string;
  readonly issuerName: string;
  readonly sac: string;
  readonly balanceRaw: string;
  /** USDC it would fetch on Aquarius now; null when the pool did not answer or it holds none. */
  readonly valueUsdcRaw: string | null;
  readonly trusted: boolean | null;
  readonly standIn: boolean;
};

export type Holdings = {
  readonly address: string;
  readonly network: NetworkName;
  readonly kind: "classic" | "passkey";
  readonly exists: boolean;
  readonly usdc: { readonly balanceRaw: string; readonly trusted: boolean | null };
  readonly keeps: readonly Holding[];
  readonly at: number;
};

async function balance(sac: string, who: string): Promise<bigint> {
  const net = network();
  const r = await simulate(net, sac, "balance", [Address.fromString(who).toScVal()]);
  if (!r.ok || !r.value.retval) return 0n;
  return BigInt(scValToNative(r.value.retval) as bigint);
}

async function worth(pool: string, inIdx: number, outIdx: number, amount: bigint): Promise<bigint | null> {
  if (amount <= 0n) return null;
  const r = await simulate(network(), pool, "estimate_swap", [nativeToScVal(outIdx, { type: "u32" }), nativeToScVal(inIdx, { type: "u32" }), nativeToScVal(amount, { type: "u128" })]);
  if (!r.ok || !r.value.retval) return null;
  return BigInt(scValToNative(r.value.retval) as bigint);
}

export async function readHoldings(address: string): Promise<Outcome<Holdings>> {
  const net = network();
  const usdc = USDC[net.name];
  const classic = StrKey.isValidEd25519PublicKey(address);
  const acct = classic ? await horizonAccount(net, address) : null;
  const account = acct && acct.ok ? acct.value : null;
  const exists = classic ? !!account : true;
  const [usdcBal, ...keepBals] = await Promise.all([balance(usdc.sac, address), ...keepAssets(net.name).map((a) => balance(a.sac, address))]);
  const keeps = await Promise.all(
    keepAssets(net.name).map(async (a, i) => {
      const bal = keepBals[i] ?? 0n;
      const value = await worth(a.pool, a.inIdx, a.outIdx, bal);
      return {
        key: a.key,
        ticker: a.ticker,
        name: a.name,
        fullName: a.fullName,
        issuerName: a.issuerName,
        sac: a.sac,
        balanceRaw: bal.toString(),
        valueUsdcRaw: value === null ? null : value.toString(),
        trusted: classic ? (a.issuer ? (account ? hasTrustline(account, a.code, a.issuer) : false) : exists) : null,
        standIn: a.standIn,
      } satisfies Holding;
    }),
  );
  return ok({
    address,
    network: net.name,
    kind: classic ? "classic" : "passkey",
    exists,
    usdc: { balanceRaw: (usdcBal ?? 0n).toString(), trusted: classic ? (account ? hasTrustline(account, usdc.code, usdc.issuer) : false) : null },
    keeps,
    at: Math.floor(Date.now() / 1000),
  });
}
