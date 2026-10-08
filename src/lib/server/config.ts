import "server-only";
import { Keypair } from "@stellar/stellar-sdk";
import { USDC, keepAssets } from "@/lib/assets/catalogue";
import { contractId } from "@/lib/deployments";
import { type Outcome, held, ok } from "@/lib/outcome";
import { KIT } from "@/lib/passkey/config";
import type { RelayDeps } from "@/lib/relay/handle";
import { network, networkName } from "@/lib/stellar/network";

/**
 * THE SERVER'S VIEW OF ITS OWN SETUP. The sponsor's secret is read from the environment
 * (`SOWN_SPONSOR_SECRET`) and lives only in this process; nothing logs it and nothing returns it.
 */
export function relayDeps(): Outcome<RelayDeps> {
  const name = networkName();
  const id = contractId(name);
  if (!id) return held(`Sown is not deployed on ${name} yet.`);
  const secret = process.env.SOWN_SPONSOR_SECRET;
  if (!secret || !secret.startsWith("S")) return held("Sown's servers are not set up to pay the network here (no sponsor key).");
  let sponsor: Keypair;
  try {
    sponsor = Keypair.fromSecret(secret);
  } catch {
    return held("Sown's servers have a malformed sponsor key.");
  }
  return ok({ net: network(name), contractId: id, sponsor, kit: KIT[name], usdc: USDC[name], keepAssets: keepAssets(name) });
}

/** The sponsor's public address, for /proof. Never the secret. */
export function sponsorAddress(): string | null {
  const secret = process.env.SOWN_SPONSOR_SECRET;
  try {
    return secret ? Keypair.fromSecret(secret).publicKey() : (process.env.SOWN_SPONSOR_PUBLIC ?? null);
  } catch {
    return null;
  }
}

/** The caller's IP for the relay's per-IP window. */
export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
