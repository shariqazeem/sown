import { type Outcome, held, ok } from "@/lib/outcome";
import { gated } from "./limiter";
import type { NetworkConfig } from "./network";

/**
 * HORIZON, FOR WHAT ONLY THE CLASSIC LEDGER KNOWS: an account's trustlines and XLM, and an
 * issuer's flags. Every read passes the endpoint's gate. A missing account is an answer
 * (`null`), not an error: a fresh wallet does not exist on chain until something funds it.
 */
export type HorizonBalance = {
  readonly asset_type: string;
  readonly asset_code?: string;
  readonly asset_issuer?: string;
  readonly balance: string;
  readonly is_authorized?: boolean;
  readonly sponsor?: string;
};

export type HorizonAccount = {
  readonly id: string;
  readonly sequence: string;
  readonly balances: readonly HorizonBalance[];
  readonly subentry_count: number;
  readonly num_sponsoring: number;
  readonly num_sponsored: number;
  readonly flags: { readonly auth_required: boolean; readonly auth_revocable: boolean; readonly auth_immutable: boolean; readonly auth_clawback_enabled: boolean };
  readonly home_domain?: string;
};

export async function horizonAccount(net: NetworkConfig, id: string): Promise<Outcome<HorizonAccount | null>> {
  try {
    const res = await gated(net.horizonUrl, () => fetch(`${net.horizonUrl}/accounts/${id}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) }));
    if (res.status === 404) return ok(null);
    if (!res.ok) return held(`Horizon answered ${res.status} for that account.`);
    return ok((await res.json()) as HorizonAccount);
  } catch (err) {
    return held(`Horizon did not answer (${err instanceof Error ? err.message : String(err)}).`);
  }
}

/** Does this account hold a trustline to code:issuer (authorised)? */
export function hasTrustline(acct: HorizonAccount, code: string, issuer: string): boolean {
  return acct.balances.some((b) => b.asset_code === code && b.asset_issuer === issuer && b.is_authorized !== false);
}

export function nativeBalance(acct: HorizonAccount): number {
  const b = acct.balances.find((x) => x.asset_type === "native");
  return b ? Number(b.balance) : 0;
}
