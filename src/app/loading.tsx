import { SkeletonRows } from "@/components/skeleton/skeleton";
import { SiteFrame } from "@/components/site/site-frame";

export default function Loading() {
  return (
    <SiteFrame send={false}>
      <section className="sw-sec">
        <h1 className="sw-display">Send money home. Part of it stays theirs.</h1>
        <SkeletonRows rows={4} />
      </section>
    </SiteFrame>
  );
}
