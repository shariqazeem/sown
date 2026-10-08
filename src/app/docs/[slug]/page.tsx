import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFrame } from "@/components/site/site-frame";
import { DOCS, docBySlug } from "@/content/docs";
import "../docs.css";

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = docBySlug((await params).slug);
  return d ? { title: d.title, description: d.lede } : {};
}

/** One doc: a reading surface at the 720 px measure, no entrance motion. */
export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = docBySlug(slug);
  if (!d) notFound();
  const i = DOCS.indexOf(d);
  const next = DOCS[i + 1];
  return (
    <SiteFrame current="docs">
      <article className="sw-sec">
        <div className="sw-col sw-doc">
          <p className="sw-kicker">
            <Link href="/docs" className="sw-link">
              Docs
            </Link>
          </p>
          <h1 className="sw-h1">{d.title}</h1>
          <p className="sw-lede">{d.lede}</p>
          <div className="sw-doc-body">{d.body}</div>
          {next ? (
            <p className="sw-doc-next">
              Next:{" "}
              <Link href={`/docs/${next.slug}`} className="sw-link">
                {next.title}
              </Link>
            </p>
          ) : null}
        </div>
      </article>
    </SiteFrame>
  );
}
