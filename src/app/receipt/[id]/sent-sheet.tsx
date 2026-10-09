"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import QRCode from "qrcode";
import { fragmentFor } from "@/lib/local";

/**
 * THE LINK, SHOWN ONCE, right after a send. It is read from this browser's storage (the only
 * place the secret lives) and never from the server. A QR code for the phone in the room, a copy
 * button, a WhatsApp share, and the line that says what the link is: the money.
 */
export function SentSheet({ id, claimKeyHex, amount }: { id: string; claimKeyHex: string; amount: string }) {
  const [link, setLink] = useState<string | null | undefined>(undefined);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const frag = fragmentFor(claimKeyHex);
    const l = frag ? `${window.location.origin}/r/${id}#${frag}` : null;
    setLink(l);
    if (!l) return;
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#000000";
    QRCode.toString(l, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: ink, light: "#00000000" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [id, claimKeyHex]);

  if (link === undefined) return <div className="sw-sent-sheet is-pending" aria-hidden />;
  if (link === null) {
    return (
      <div className="sw-note is-warn">
        This envelope&apos;s link was made in another browser, so it cannot be shown here. Open Sown in the browser that sent it, or take this back from{" "}
        <Link href="/sent" className="sw-link">
          Your sends
        </Link>{" "}
        and send again.
      </div>
    );
  }
  const text = `I sent you ${amount} with Sown. Part of it is yours to keep. Tap this to claim it with your face: ${link}`;
  return (
    <div className="sw-sent-sheet">
      <div className="sw-sent-top">
        <div>
          <p className="sw-sent-title">Send them this link</p>
          <p className="sw-sent-say">They tap it, their face makes them a wallet, and both parts are theirs. Or let them scan it with their phone.</p>
        </div>
        {qr ? <div className="sw-sent-qr" aria-label="The claim link as a QR code" dangerouslySetInnerHTML={{ __html: qr }} /> : null}
      </div>
      <p className="sw-sent-link mono" aria-label="The claim link">
        {link}
      </p>
      <div className="sw-actions">
        <a className="sw-btn is-primary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          Share on WhatsApp
        </a>
        <button
          type="button"
          className="sw-btn"
          onClick={() => {
            void navigator.clipboard?.writeText(link).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2_000);
            });
          }}
        >
          {copied ? <Check size={16} strokeWidth={2} aria-hidden /> : <Copy size={16} strokeWidth={2} aria-hidden />}
          {copied ? "Copied" : "Copy the link"}
        </button>
      </div>
      <p className="sw-sent-fine">Anyone with this link can claim it. Send it only to them. Keep it until they do: it is not stored anywhere but this browser.</p>
      <p className="sw-sent-more">
        <Link href="/plan" className="sw-link">
          Send again next month
        </Link>
        <Link href="/sent" className="sw-link">
          Your sends
        </Link>
      </p>
    </div>
  );
}
