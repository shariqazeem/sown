import type { Metadata } from "next";
import { SiteFrame } from "@/components/site/site-frame";
import { keepAssets } from "@/lib/assets/catalogue";
import { network } from "@/lib/stellar/network";
import { PlanCard } from "./plan-card";

export const metadata: Metadata = { title: "Every month", robots: { index: false } };

/** /plan — "every month", honestly: a reminder with the send prefilled, kept in this browser. */
export default function PlanPage() {
  const net = network();
  return (
    <SiteFrame send={false}>
      <section className="sw-sec">
        <div className="sw-col">
          <p className="sw-kicker">Every month</p>
          <h1 className="sw-h1">Send again every month.</h1>
          <p className="sw-lede">Stellar has no standing orders yet. Sown reminds you; the send is one tap. The rule on your own wallet is next.</p>
          <PlanCard names={Object.fromEntries(keepAssets(net.name).map((a) => [a.key, a.standIn ? "XLM, the testnet stand-in" : a.fullName]))} />
        </div>
      </section>
    </SiteFrame>
  );
}
