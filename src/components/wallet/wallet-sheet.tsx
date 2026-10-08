"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { type WalletOption, isPhone, listWallets } from "@/lib/wallet/kit";
import "@/components/send/send.css";

/**
 * THE WALLET SHEET: the Stellar wallets in this browser, the ones to install, and the honest
 * line when there are none. A native dialog, a bottom sheet on a phone. Connecting moves nothing.
 */
export function WalletSheet({
  open,
  onClose,
  onPick,
  passphrase,
  title = "Choose your wallet",
  intro,
  why,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (w: WalletOption) => void;
  passphrase: string;
  title?: string;
  intro?: string;
  why?: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>(".sw-sheet-title")?.focus();
      d.scrollTop = 0;
      void listWallets(passphrase).then(setWallets);
    } else if (!open && d.open) d.close();
  }, [open, passphrase]);
  const here = (wallets ?? []).filter((w) => w.available);
  const elsewhere = (wallets ?? []).filter((w) => !w.available);
  return (
    <dialog ref={ref} className="sw-sheet" aria-label={title} onClose={onClose} onCancel={onClose}>
      <div className="sw-sheet-head">
        <p className="sw-sheet-title" tabIndex={-1}>
          {title}
        </p>
        <button type="button" className="sw-sheet-close" onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <div className="sw-sheet-body">
        {intro ? <p className="sw-sheet-say">{intro}</p> : null}
        {wallets === null ? <p className="sw-sheet-say">Looking for Stellar wallets in this browser…</p> : null}
        {wallets && here.length === 0 ? (
          <p className="sw-sheet-say">
            {isPhone()
              ? "No Stellar wallet is open in this browser. Open this page in your wallet app's own browser, or use a wallet that works on the web, such as xBull or Albedo."
              : "No Stellar wallet is installed in this browser. Install one of these, then come back to this page."}
          </p>
        ) : null}
        <div className="sw-wallets">
          {here.map((w) => (
            <button key={w.id} type="button" className="sw-wallet" onClick={() => onPick(w)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {w.icon ? <img src={w.icon} alt="" width={22} height={22} /> : null}
              {w.name}
            </button>
          ))}
          {elsewhere.map((w) => (
            <a key={w.id} href={w.url} className="sw-wallet is-install" target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {w.icon ? <img src={w.icon} alt="" width={22} height={22} /> : null}
              Get {w.name}
            </a>
          ))}
        </div>
        {why ? <p className="sw-note is-warn">{why}</p> : null}
        <p className="sw-sheet-fine">Connecting moves nothing. Every approval says what it does first.</p>
      </div>
    </dialog>
  );
}
