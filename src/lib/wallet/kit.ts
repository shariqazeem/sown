"use client";

import { type Outcome, held, ok } from "@/lib/outcome";

/**
 * THE SENDER'S WALLET, THROUGH THE STELLAR WALLETS KIT (JSR 2.5.0, the range the Smart Account
 * Kit accepts). Loaded lazily so nothing of it runs on the server. Sown draws its own wallet
 * sheet from the kit's modules (name, icon, install page, whether it is in this browser) and
 * uses the kit only to connect and to sign.
 */
export type WalletOption = { readonly id: string; readonly name: string; readonly icon: string; readonly url: string; readonly available: boolean };

type Kit = typeof import("@creit-tech/stellar-wallets-kit/sdk").StellarWalletsKit;
let ready: Promise<Kit> | null = null;

function kit(passphrase: string): Promise<Kit> {
  if (!ready) {
    ready = (async () => {
      const [{ StellarWalletsKit }, fr, xb, lo, ha, al] = await Promise.all([
        import("@creit-tech/stellar-wallets-kit/sdk"),
        import("@creit-tech/stellar-wallets-kit/modules/freighter"),
        import("@creit-tech/stellar-wallets-kit/modules/xbull"),
        import("@creit-tech/stellar-wallets-kit/modules/lobstr"),
        import("@creit-tech/stellar-wallets-kit/modules/hana"),
        import("@creit-tech/stellar-wallets-kit/modules/albedo"),
      ]);
      const modules: unknown[] = [new fr.FreighterModule(), new xb.xBullModule(), new lo.LobstrModule(), new ha.HanaModule(), new al.AlbedoModule()];
      // Testnet only, behind NEXT_PUBLIC_SOWN_TEST_WALLET=1: a wallet held in this browser.
      const { TestWalletModule, testWalletEnabled } = await import("./test-wallet");
      if (testWalletEnabled()) modules.unshift(new TestWalletModule());
      StellarWalletsKit.init({ modules: modules as never, network: passphrase as never });
      return StellarWalletsKit;
    })();
  }
  return ready;
}

function reason(err: unknown, fallback: string): string {
  const m = err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "";
  if (/reject|denied|declined|cancel|closed|user/i.test(m)) return "";
  return m ? `${fallback} (${m.slice(0, 120)})` : fallback;
}

export async function listWallets(passphrase: string): Promise<WalletOption[]> {
  try {
    const k = await kit(passphrase);
    const all = await k.refreshSupportedWallets();
    return all.map((w) => ({ id: w.id, name: w.name, icon: w.icon, url: w.url, available: w.isAvailable }));
  } catch {
    return [];
  }
}

/** Connect a wallet and learn its address. An empty `why` means the person said no. */
export async function connectWallet(passphrase: string, id: string): Promise<Outcome<{ address: string }>> {
  try {
    const k = await kit(passphrase);
    k.setWallet(id);
    const { address } = await k.fetchAddress();
    if (!address) return held("The wallet did not share an address.");
    return ok({ address });
  } catch (err) {
    return held(reason(err, "The wallet did not connect"));
  }
}

/** Sign one transaction. An empty `why` means the person said no; nothing moved either way. */
export async function signWith(passphrase: string, id: string, xdr: string, address: string): Promise<Outcome<string>> {
  try {
    const k = await kit(passphrase);
    k.setWallet(id);
    const { signedTxXdr } = await k.signTransaction(xdr, { networkPassphrase: passphrase, address });
    if (!signedTxXdr) return held("The wallet returned nothing to send.");
    return ok(signedTxXdr);
  } catch (err) {
    return held(reason(err, "The wallet did not sign"));
  }
}

const REMEMBERED = "sown:sender-wallet";

export function rememberWallet(v: { id: string; address: string } | null): void {
  try {
    if (v) localStorage.setItem(REMEMBERED, JSON.stringify(v));
    else localStorage.removeItem(REMEMBERED);
  } catch {
    // A private window asks again next time, which is fine.
  }
}

export function rememberedWallet(): { id: string; address: string } | null {
  try {
    const v = localStorage.getItem(REMEMBERED);
    const p = v ? (JSON.parse(v) as { id?: unknown; address?: unknown }) : null;
    return p && typeof p.id === "string" && typeof p.address === "string" ? { id: p.id, address: p.address } : null;
  } catch {
    return null;
  }
}

export function isPhone(): boolean {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
