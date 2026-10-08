import type { Metadata } from "next";
import { Section, SiteFrame } from "@/components/site/site-frame";
import { type AssetRowData, assetRows } from "@/lib/assets/rows";
import { stampUTC, units } from "@/lib/format";
import { network } from "@/lib/stellar/network";
import "./assets.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "What can be kept",
  description: "US Treasuries (Ondo USDY), US Treasury notes (Etherfuse USTRY) and Mexican CETES on Stellar, each with what its issuer can do, read from the issuer's account.",
};

/**
 * /assets — what a send can keep. Each row: the name people use, the issuer's own words, what
 * the issuer can do (read from its account now), and the pool's reserves (read now). No price
 * chart, no return, no yield.
 */
export default async function AssetsPage() {
  const net = network();
  const here = await assetRows(net.name);
  const mainnetToo = net.name === "testnet" ? await assetRows("mainnet") : null;
  return (
    <SiteFrame current="assets">
      <section className="sw-sec">
        <div className="sw-col">
          <p className="sw-kicker">Assets</p>
          <h1 className="sw-h1">What they can keep</h1>
          <p className="sw-lede">Government debt that already trades on Stellar, bought on Aquarius inside the send. What each issuer can do is read from its account on the ledger as this page loads.</p>
        </div>
        <div className="sw-asset-rows">
          {net.name === "testnet" ? (
            <>
              <Section label="On testnet, where this page is served">
                {here.map((r) => (
                  <AssetRow key={r.asset.key} r={r} />
                ))}
              </Section>
              <Section label="On mainnet, read from mainnet now">{mainnetToo?.map((r) => <AssetRow key={r.asset.key} r={r} />)}</Section>
            </>
          ) : (
            <Section label="On mainnet">
              {here.map((r) => (
                <AssetRow key={r.asset.key} r={r} />
              ))}
            </Section>
          )}
        </div>
        <p className="sw-assets-close">When stocks and ETFs held at DTC reach Stellar (expected in the first half of 2027), a stock becomes a row here. Same send, same receipt.</p>
      </section>
    </SiteFrame>
  );
}

function AssetRow({ r }: { r: AssetRowData }) {
  const a = r.asset;
  const price = r.perUsdcRaw && r.perUsdcRaw > 0n ? 1e7 / Number(r.perUsdcRaw) : null;
  return (
    <article className="sw-asset">
      <div className="sw-asset-head">
        <h2 className="name">{a.standIn ? "XLM, the testnet stand-in" : a.name}</h2>
        <p className="tick">
          {a.ticker} · {a.issuerName}
        </p>
      </div>
      <p className="quote">
        {a.standIn ? (
          a.quote
        ) : (
          <>
            {a.issuerName}: “{a.quote}”.{" "}
            <a href={a.quoteSource} target="_blank" rel="noreferrer" className="sw-link">
              {a.quoteSourceLabel}
            </a>
          </>
        )}
      </p>
      <ul className="sw-asset-chips" aria-label="What the issuer can do, read from the ledger">
        {r.chips.map((c) => (
          <li key={c} className={`sw-flag${/can (freeze|take back)/.test(c) ? " is-power" : ""}`}>
            {c}
          </li>
        ))}
        {a.notForUs ? <li className="sw-flag">not for US persons</li> : null}
      </ul>
      <p className="line">{r.sentence}</p>
      <dl className="sw-asset-facts">
        <div>
          <dt>Aquarius pool</dt>
          <dd>
            {r.reserves ? (
              <>
                {units(r.reserves[1], 2)} {a.ticker} and {units(r.reserves[0], 2)} USDC, {a.poolFeeBps / 100}% fee
              </>
            ) : (
              "The pool did not answer just now."
            )}
          </dd>
        </div>
        <div>
          <dt>The price right now</dt>
          <dd>{price ? `$${price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: price < 0.1 ? 6 : 4 })} per ${a.ticker}, for one USDC on the pool` : "Not read just now."}</dd>
        </div>
        <div>
          <dt>Read</dt>
          <dd>
            {stampUTC(r.readAt)}
            {r.flags?.homeDomain ? ` · issuer account on ${r.flags.homeDomain}` : ""}
          </dd>
        </div>
      </dl>
    </article>
  );
}
