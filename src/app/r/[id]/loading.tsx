import { SkeletonEnvelope } from "@/components/skeleton/skeleton";
import { SiteFrame } from "@/components/site/site-frame";

export default function Loading() {
  return (
    <SiteFrame send={false}>
      <section className="sw-sec">
        <SkeletonEnvelope label="Opening your envelope" />
      </section>
    </SiteFrame>
  );
}
