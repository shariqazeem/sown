import { SkeletonRows } from "@/components/skeleton/skeleton";
import { SiteFrame } from "@/components/site/site-frame";

export default function Loading() {
  return (
    <SiteFrame current="proof" ink>
      <section className="sw-sec">
        <p className="sw-kicker">Proof</p>
        <h1 className="sw-display">The proof, read from the chain.</h1>
        <SkeletonRows rows={6} />
      </section>
    </SiteFrame>
  );
}
