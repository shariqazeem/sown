"use client";

import { type Outcome, held, ok } from "@/lib/outcome";
import { KIT } from "@/lib/passkey/config";
import { network } from "@/lib/stellar/network";

/**
 * THE RECIPIENT'S WALLET, MADE WITH THEIR FACE. The Smart Account Kit (0.8.0) creates a passkey
 * on this phone and builds the wallet's deployment; Sown's servers inspect it, pay for it and
 * submit it, then submit the claim the link signed. The kit is loaded only in the browser.
 *
 * The passkey is bound to this origin (`rpId` is the page's host): a wallet made here opens
 * only here. On a new phone it is found again by the same passkey, synced by the phone's
 * platform (iCloud Keychain, Google Password Manager).
 */
type Kit = InstanceType<typeof import("smart-account-kit").SmartAccountKit>;
let kitPromise: Promise<Kit> | null = null;

export async function passkeyKit(): Promise<Kit> {
  if (!kitPromise) {
    kitPromise = (async () => {
      const { SmartAccountKit, IndexedDBStorage } = await import("smart-account-kit");
      const net = network();
      return new SmartAccountKit({
        rpcUrl: net.rpcUrl,
        networkPassphrase: net.passphrase,
        accountWasmHash: KIT[net.name].accountWasmHash,
        webauthnVerifierAddress: KIT[net.name].webauthnVerifier,
        storage: new IndexedDBStorage(),
        rpId: window.location.hostname,
        rpName: "Sown",
        allowedOrigins: [window.location.origin],
      });
    })();
  }
  return kitPromise;
}

/** Can this browser make a wallet with a face or fingerprint? "maybe" when it cannot say. */
export async function faceSupport(): Promise<"yes" | "no" | "maybe"> {
  if (typeof window === "undefined" || !window.isSecureContext || !("PublicKeyCredential" in window)) return "no";
  try {
    const pk = window.PublicKeyCredential as unknown as { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> };
    if (!pk.isUserVerifyingPlatformAuthenticatorAvailable) return "maybe";
    return (await pk.isUserVerifyingPlatformAuthenticatorAvailable()) ? "yes" : "no";
  } catch {
    return "maybe";
  }
}

/** In-app browsers (WhatsApp, Instagram, Facebook, Line…) that rarely carry WebAuthn. */
export function inAppBrowser(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/WhatsApp/i.test(ua)) return "WhatsApp";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
  if (/Line\//i.test(ua)) return "Line";
  if (/Telegram/i.test(ua)) return "Telegram";
  return null;
}

export type MadeWallet = { readonly contractId: string; readonly credentialId: string; readonly func: string; readonly auth: readonly string[] };

/** The one Face ID: a passkey on this phone and the wallet's deployment, built but not sent. */
export async function makeWallet(label: string): Promise<Outcome<MadeWallet>> {
  try {
    const kit = await passkeyKit();
    const made = await kit.createWallet("Sown", label, { autoSubmit: false });
    if (!made.relayerPayload) return held("Your phone made a passkey, but the wallet could not be prepared.");
    return ok({ contractId: made.contractId, credentialId: made.credentialId, func: made.relayerPayload.func, auth: made.relayerPayload.auth });
  } catch (err) {
    const m = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    if (/NotAllowed|AbortError|cancel|timed out/i.test(m)) return held("");
    if (/InvalidState|already registered/i.test(m)) return held("This phone already has a Sown passkey for that. Try again.");
    return held(`Your phone could not make a passkey here (${m.slice(0, 140)}).`);
  }
}
