import { networkName } from "@/lib/stellar/network";

/**
 * WHERE SOWN IS SERVED. Passkeys are bound to this origin: a wallet made on one domain cannot
 * be opened from another, so the mainnet domain must be final before the first real claim.
 */
export function siteUrl(): string {
  const v = process.env.NEXT_PUBLIC_SITE_URL;
  if (v && /^https?:\/\//.test(v)) return v.replace(/\/+$/, "");
  return "http://localhost:3100";
}

export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/";

/** True on testnet: every surface says so in the same size as its figures. */
export function isTestnet(): boolean {
  return networkName() === "testnet";
}
