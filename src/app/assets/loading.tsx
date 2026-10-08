import { SkeletonRows } from "@/components/skeleton/skeleton";
import { SiteFrame } from "@/components/site/site-frame";

export default function Loading() {
  return (
    <SiteFrame current="assets">
      <section className="sw-sec">
        <p className="sw-kicker">Assets</p>
        <h1 className="sw-h1">What they can keep</h1>
        <SkeletonRows rows={5} />
      </section>
    </SiteFrame>
  );
}
