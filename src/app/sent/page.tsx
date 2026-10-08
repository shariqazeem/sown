import type { Metadata } from "next";
import { SiteFrame } from "@/components/site/site-frame";
import { keepAssets } from "@/lib/assets/catalogue";
import { network } from "@/lib/stellar/network";
import { SentList } from "./sent-list";

export const metadata: Metadata = { title: "Your sends", robots: { index: false } };

/** /sent — every envelope from the connected wallet, each with its state and what can be done. */
export default function SentPage() {
  const net = network();
  return (
    <SiteFrame send={false}>
      <section className="sw-sec">
        <div className="sw-col">
          <p className="sw-kicker">Your sends</p>
          <h1 className="sw-h1">Every envelope from your wallet.</h1>
          <p className="sw-lede">Waiting ones can be shared again from the browser that sent them, or taken back. Claimed and returned ones link their receipts.</p>
        </div>
        <SentList passphrase={net.passphrase} tickers={Object.fromEntries(keepAssets(net.name).map((a) => [a.sac, a.ticker]))} explorer={net.explorer} />
      </section>
    </SiteFrame>
  );
}
