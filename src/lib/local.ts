"use client";

import { networkName } from "@/lib/stellar/network";

/**
 * WHAT THIS BROWSER REMEMBERS, AND NOTHING ELSE DOES. Every read and write is guarded: a
 * private window, blocked storage or a full disk returns nothing and the page still works.
 *
 *  - the links a sender made (the only copy of each claim secret lives here)
 *  - the passkey wallet a recipient made, so "Your wallet" opens without a prompt
 *  - the wallet a sender last connected
 *  - the monthly plan
 */
const ns = (k: string) => `sown:${networkName()}:${k}`;

export function readJson<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(ns(key));
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    if (value === null) localStorage.removeItem(ns(key));
    else localStorage.setItem(ns(key), JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("sown:storage", { detail: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * The claim links this browser made, keyed by the envelope's `claim_key` (hex). Saved BEFORE the
 * wallet is asked to sign, so a send that lands while the tab is closing still has its link
 * here: the envelope names its own key, and the key finds the secret.
 */
export type Links = Record<string, { readonly secret: string; readonly at: number }>;

export function saveLink(claimKeyHex: string, secret: string): boolean {
  const links = readJson<Links>("links") ?? {};
  links[claimKeyHex] = { secret, at: Math.floor(Date.now() / 1000) };
  return writeJson("links", links);
}

export function linkFor(claimKeyHex: string): string | null {
  return readJson<Links>("links")?.[claimKeyHex]?.secret ?? null;
}

/** The passkey wallet made in this browser. */
export type SavedWallet = { readonly contractId: string; readonly credentialId: string; readonly at: number };

export function savedWallet(): SavedWallet | null {
  const w = readJson<SavedWallet>("wallet");
  return w && typeof w.contractId === "string" && w.contractId.startsWith("C") ? w : null;
}

export function saveWallet(w: SavedWallet | null): boolean {
  return writeJson("wallet", w);
}

/** Envelopes this browser claimed: their ids, so "Your wallet" can list them without an indexer. */
export function claimedHere(): string[] {
  return readJson<string[]>("claimed") ?? [];
}

export function rememberClaim(id: string): void {
  const list = claimedHere();
  if (!list.includes(id)) writeJson("claimed", [id, ...list].slice(0, 200));
}
