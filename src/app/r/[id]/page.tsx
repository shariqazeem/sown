import type { Metadata } from "next";
import { SiteFrame } from "@/components/site/site-frame";
import { disclose } from "@/lib/assets/issuer-flags";
import { readReceipt } from "@/lib/envelope/receipt";
import { envelopeToJson } from "@/lib/envelope/types";
import { contractId } from "@/lib/deployments";
import { network } from "@/lib/stellar/network";
import { ClaimCard } from "./claim";
import "./claim.css";

export const dynamic = "force-dynamic";

// A claim page is somebody's money: never indexed, never previewed with its figures.
export const metadata: Metadata = { title: "Your envelope", robots: { index: false, follow: false } };

/**
 * THE CLAIM PAGE, /r/<id>#<secret>. The server reads the envelope from the contract; the
 * secret stays in the fragment, which no server receives, and the browser checks it against
 * the envelope's own key before anything is signed or sent.
 */
export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const net = network();
  const r = await readReceipt(id);
  const asset = r.ok ? r.value.asset : null;
  const d = asset ? await disclose(net, asset) : null;
  return (
    <SiteFrame send={false}>
      <section className="sw-sec sw-claim-sec">
        <ClaimCard
          id={id}
          read={r.ok ? { envelope: envelopeToJson(r.value.envelope), claimTx: r.value.claimTx?.hash ?? null } : { error: r.why, missing: /no envelope|not an envelope/i.test(r.why) }}
          asset={asset ? { ticker: asset.ticker, name: asset.name, fullName: asset.fullName, issuerName: asset.issuerName, standIn: asset.standIn, disclosure: d?.sentence ?? "" } : null}
          passphrase={net.passphrase}
          testnet={net.name === "testnet"}
          explorer={net.explorer}
          contractId={contractId(net.name) ?? ""}
        />
      </section>
    </SiteFrame>
  );
}
