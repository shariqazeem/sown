import type { Metadata } from "next";
import { SiteFrame } from "@/components/site/site-frame";
import { USDC, keepAssets } from "@/lib/assets/catalogue";
import { disclose } from "@/lib/assets/issuer-flags";
import { network } from "@/lib/stellar/network";
import { Mine } from "./mine";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your wallet", robots: { index: false } };

/** /mine — the recipient's wallet: what it holds, its envelopes, moving out, cashing out. */
export default async function MinePage() {
  const net = network();
  const lines = await Promise.all(keepAssets(net.name).map((a) => disclose(net, a)));
  return (
    <SiteFrame send={false}>
      <section className="sw-sec">
        <Mine
          usdcSac={USDC[net.name].sac}
          assets={lines.map((l) => ({ key: l.asset.key, sac: l.asset.sac, ticker: l.asset.ticker, name: l.asset.name, issuerName: l.asset.issuerName, standIn: l.asset.standIn, line: l.sentence, code: l.asset.code, issuer: l.asset.issuer }))}
          explorer={net.explorer}
          testnet={net.name === "testnet"}
        />
      </section>
    </SiteFrame>
  );
}
