import { SkeletonEnvelope } from "@/components/skeleton/skeleton";
import { SiteFrame } from "@/components/site/site-frame";

export default function Loading() {
  return (
    <SiteFrame>
      <section className="sw-sec">
        <SkeletonEnvelope label="Reading the envelope from the ledger" />
      </section>
    </SiteFrame>
  );
}
