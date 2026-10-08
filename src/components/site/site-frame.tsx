import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { isTestnet } from "@/lib/site";
import { NavMenu, NavWallet } from "./nav-client";
import "./site.css";

/**
 * THE FRAME OF EVERY PAGE: the paper nav (Sown, Assets, Proof, Docs, "Your wallet" once a
 * passkey wallet lives in this browser, and the one primary action, Send), the page, the
 * footer. `ink` turns the whole frame dark, for /proof only.
 */
export function SiteNav({ current, send = true }: { current?: string; send?: boolean }) {
  return (
    <nav className="sw-nav" aria-label="Sown">
      <Link href="/" className="sw-nav-brand" aria-label="Sown, home">
        <Wordmark size={22} />
        {isTestnet() ? <span className="sw-net">Testnet</span> : null}
      </Link>
      <Link href="/assets" className="sw-nav-link is-wide" aria-current={current === "assets" ? "page" : undefined}>
        Assets
      </Link>
      <Link href="/proof" className="sw-nav-link is-wide" aria-current={current === "proof" ? "page" : undefined}>
        Proof
      </Link>
      <Link href="/docs" className="sw-nav-link is-wide" aria-current={current === "docs" ? "page" : undefined}>
        Docs
      </Link>
      <NavWallet />
      {send ? (
        <Link href="/#send" className="sw-nav-send is-wide">
          Send
        </Link>
      ) : null}
      <NavMenu />
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="sw-foot">
      <span>Sown. Unaudited. Not for US persons.</span>
      <span className="spacer" />
      <Link href="/sent">Your sends</Link>
      <Link href="/mine">Your wallet</Link>
      <Link href="/plan">Every month</Link>
      <Link href="/assets">Assets</Link>
      <Link href="/proof">Proof</Link>
      <Link href="/docs">Docs</Link>
    </footer>
  );
}

/** `send={false}` on a page that has its own primary action: one primary button per screen. */
export function SiteFrame({ children, current, ink = false, send = true }: { children: ReactNode; current?: string; ink?: boolean; send?: boolean }) {
  return (
    <div className={`sw-site${ink ? " sw-ink" : ""}`}>
      <SiteNav current={current} send={send} />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

/** A ruled section: a label (and an aside), then rows or paragraphs. */
export function Section({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="sw-section">
      <p className="sw-section-label">
        <span>{label}</span>
        {aside ? <span>{aside}</span> : null}
      </p>
      {children}
    </section>
  );
}

export function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="sw-truth">
      <span className="k">{k}</span>
      <div className="v">{children}</div>
    </div>
  );
}
