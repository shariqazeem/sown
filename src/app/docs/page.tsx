import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "@/components/site/site-frame";
import { DOCS } from "@/content/docs";
import "./docs.css";

export const metadata: Metadata = { title: "Docs", description: "How a Sown send works, the envelope, why not claimable balances, what the issuer can do, fees, and the limits." };

/** /docs — six short pages, facts stated. */
export default function DocsIndex() {
  return (
    <SiteFrame current="docs">
      <section className="sw-sec">
        <div className="sw-col">
          <p className="sw-kicker">Docs</p>
          <h1 className="sw-h1">How Sown works, in six short pages.</h1>
          <ol className="sw-doc-index">
            {DOCS.map((d) => (
              <li key={d.slug}>
                <Link href={`/docs/${d.slug}`} className="t">
                  {d.title}
                </Link>
                <p className="d">{d.lede}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </SiteFrame>
  );
}
