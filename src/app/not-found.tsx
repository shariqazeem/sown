import Link from "next/link";
import { SiteFrame } from "@/components/site/site-frame";

/** Nothing at this address: four places worth going, and no apology. */
export default function NotFound() {
  return (
    <SiteFrame send={false}>
      <section className="sw-sec">
        <div className="sw-col">
          <p className="sw-kicker">Not here</p>
          <h1 className="sw-h1">Nothing at this address.</h1>
          <p className="sw-lede">An envelope number nobody has used yet, a receipt that was never written, or a page that moved.</p>
          <div className="sw-actions" style={{ marginTop: "var(--s-6)" }}>
            <Link href="/" className="sw-btn is-primary">
              Send money home
            </Link>
            <Link href="/sent" className="sw-btn">
              Your sends
            </Link>
            <Link href="/mine" className="sw-btn">
              Your wallet
            </Link>
            <Link href="/proof" className="sw-btn">
              Every envelope
            </Link>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
