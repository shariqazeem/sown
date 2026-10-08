"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { linkFor } from "@/lib/local";

/**
 * THE LINK, SHOWN ONCE, right after a send. It is read from this browser's storage (the only
 * place the secret lives) and never from the server. Copy, or share on WhatsApp, and the line
 * that says what the link is: the money.
 */
export function SentSheet({ id, claimKeyHex, amount }: { id: string; claimKeyHex: string; amount: string }) {
  const [link, setLink] = useState<string | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const secret = linkFor(claimKeyHex);
    setLink(secret ? `${window.location.origin}/r/${id}#${secret}` : null);
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
  const text = `I sent you ${amount} with Sown. Part of it is yours to keep. Open this to claim it with your face: ${link}`;
  return (
    <div className="sw-sent-sheet">
      <p className="sw-sent-title">Send them this link</p>
      <p className="sw-sent-link mono" aria-label="The claim link">
        {link}
      </p>
      <div className="sw-actions">
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
          {copied ? "Copied" : "Copy"}
        </button>
        <a className="sw-btn is-primary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          Share on WhatsApp
        </a>
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
