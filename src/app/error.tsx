"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SiteFrame } from "@/components/site/site-frame";

/**
 * WHAT HAPPENED, AND THE ONE ACTION THAT MIGHT WORK (Scrip's error page). Never a stack trace;
 * the digest is there so the same error can be found in the server's log.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const refused = /429|rate limit|too many/i.test(error.message);
  return (
    <SiteFrame send={false}>
      <section className="sw-sec">
        <div className="sw-col">
          <p className="sw-kicker">This page</p>
          <h1 className="sw-h1">{refused ? "The Stellar network's endpoint is asking us to wait." : "This page could not be built."}</h1>
          <p className="sw-lede">
            {refused
              ? "Nothing is lost and nothing was sent. The figures here are read from the ledger when you ask, and the endpoint wants a moment."
              : "The ledger, or the cache of it, did not answer. Nothing was sent and nothing was charged."}
          </p>
          <div className="sw-actions" style={{ marginTop: "var(--s-6)" }}>
            <button type="button" className="sw-btn is-primary" onClick={reset}>
              Ask again
            </button>
            <Link href="/" className="sw-btn">
              The front page
            </Link>
          </div>
          {error.digest ? <p className="sw-kicker mono" style={{ marginTop: "var(--s-5)" }}>{error.digest}</p> : null}
        </div>
      </section>
    </SiteFrame>
  );
}
