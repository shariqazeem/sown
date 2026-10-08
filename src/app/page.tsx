import Link from "next/link";
import { Envelope } from "@/components/envelope/envelope";
import { SendCard } from "@/components/send/send-card";
import { Row, Section, SiteFrame } from "@/components/site/site-frame";
import { deployment } from "@/lib/deployments";
import { bps, fromRaw, short, stampUTC, units, usdAligned } from "@/lib/format";
import { cardAssets, latestOutsideTeam, openingQuote } from "@/lib/front";
import { isTestnet } from "@/lib/site";
import { network } from "@/lib/stellar/network";
import { xlmUsd } from "@/lib/xlm-price";
import "./front.css";

export const dynamic = "force-dynamic";

/**
 * THE FRONT DOOR. Paper. The headline beside the send card (the card first on a phone), then
 * how it works, what can be kept, one envelope, and what to know before sending.
 */
export default async function Home() {
  const net = network();
  const [assets, q, latest, price] = await Promise.all([cardAssets(), openingQuote(), latestOutsideTeam(), xlmUsd()]);
  const deployed = !!deployment(net.name);
  const testnet = isTestnet();
  const first = assets[0];

  return (
    <SiteFrame send={false}>
      <section className="sw-sec sw-hero">
        <div className="sw-hero-words">
          <h1 className="sw-display">Send money home. Part of it stays theirs.</h1>
          <p className="sw-lede">Send dollars as you do. Keep a slice as US Treasuries, in their own wallet, claimable with their face. A receipt for both.</p>
          <p className="sw-hero-line">Remittances are spent the week they arrive. Sown makes part of every one stay.</p>
          {testnet ? (
            <p className="sw-note is-warn sw-hero-net">
              This is Sown on testnet. The keep is XLM standing in for US Treasuries, which do not exist on testnet, and test USDC has no value. Mainnet keeps Ondo USDY, Etherfuse USTRY and CETES.
            </p>
          ) : null}
        </div>
        <div className="sw-hero-card">
          <SendCard assets={assets} initialQuote={q} passphrase={net.passphrase} testnet={testnet} xlmUsd={price} deployed={deployed} />
        </div>
      </section>

      <section className="sw-sec">
        <h2 className="sw-h2">How Sown works</h2>
        <ol className="sw-steps">
          <li>
            <span className="n">1</span>
            <div>
              <p className="t">You send dollars, as you do.</p>
              <p className="d">USDC from the Stellar wallet you already use, with one approval. Choose how much they keep: 10% unless you say otherwise.</p>
            </div>
          </li>
          <li>
            <span className="n">2</span>
            <div>
              <p className="t">The keep becomes US Treasuries in the same transaction.</p>
              <p className="d">Sown buys it on Aquarius, Stellar&apos;s exchange, at the price you saw, or nothing happens. Both parts wait in an envelope that only the link can open.</p>
            </div>
          </li>
          <li>
            <span className="n">3</span>
            <div>
              <p className="t">They claim it with their face.</p>
              <p className="d">You share a link. They tap it, Face ID makes them a wallet only they control, and Sown&apos;s servers pay the network. Dollars to spend, Treasuries that stay.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="sw-sec sw-two">
        <div>
          <h2 className="sw-h2">What they can keep</h2>
          <p className="sw-body">Government debt that already trades on Stellar, held as a balance in their own wallet. What each issuer can do is read from the ledger, not from a brochure.</p>
          <p className="sw-body">
            <Link href="/assets" className="sw-link">
              Every asset, with its issuer&apos;s powers
            </Link>
          </p>
        </div>
        <div className="sw-asset-list">
          {assets.map((a) => (
            <div key={a.key} className="sw-asset-row">
              <p className="name">
                {a.name} <span className="tick">{a.ticker} · {a.issuerName}</span>
              </p>
              <p className="line">{a.disclosure}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sw-sec sw-two">
        <div>
          <h2 className="sw-h2">{latest ? "A real envelope" : "What a receipt looks like"}</h2>
          <p className="sw-body">
            {latest
              ? "The latest envelope claimed from a sender outside the team, read from the contract as this page loaded."
              : "No envelope from outside the team has been claimed yet, so this is arithmetic at the pool's price right now, labelled as such. The first real one replaces it."}
          </p>
          <p className="sw-body">
            <Link href="/proof" className="sw-link">
              Every envelope, and the contract, on the proof page
            </Link>
          </p>
        </div>
        <div className="sw-env-slot">
          {latest ? (
            <Envelope
              href={`/receipt/${latest.id}`}
              kicker="Claimed on Stellar"
              sent={<><strong>{usdAligned(fromRaw(latest.cash + latest.keepIn))}</strong> sent</>}
              became={`${bps(latest.keepBps)} kept as`}
              units={units(latest.keepOut)}
              symbol={assets.find((a) => a.sac === latest.keepAsset)?.ticker ?? "units"}
              assetLine={assets.find((a) => a.sac === latest.keepAsset)?.fullName}
              when={stampUTC(latest.claimedAt)}
              where={<>to <span className="addr">{short(latest.claimedBy ?? "")}</span></>}
              compact
            />
          ) : first ? (
            <Envelope
              tone="example"
              kicker="A worked example, not a receipt"
              sent={<><strong>$100.00</strong> sent</>}
              became="10% kept as"
              units={q && q.keepOutRaw !== "0" ? units(q.keepOutRaw) : "—"}
              symbol={first.ticker}
              assetLine={first.standIn ? "XLM, standing in for US Treasuries on testnet" : first.fullName}
              when="claimed with Face ID, seconds later"
              sections={[
                {
                  rows: [
                    { k: "To spend", v: q ? usdAligned(fromRaw(q.cashRaw)) : "$90.00" },
                    { k: "Still held", v: "measured 30 days after the claim", tone: "muted" },
                  ],
                },
              ]}
              foot={q ? `Arithmetic at the pool's price as this page loaded (ledger ${q.ledger.toLocaleString("en-US")}). The first real envelope replaces it.` : "The pool did not answer as this page loaded, so no figure is shown."}
            />
          ) : null}
        </div>
      </section>

      <section className="sw-sec">
        <div className="sw-col">
          <Section label="Before you send">
            <div className="sw-truths">
              <Row k="It can fall">A keep is priced by its pool and its issuer. Sown never shows a return, because nobody can promise one.</Row>
              <Row k="The issuer">Each issuer can do what its account flags say, shown on every row before you send.</Row>
              <Row k="The link is the money">Anyone with the link can claim the envelope. Send it only to them.</Row>
              <Row k="It comes back">Unclaimed envelopes go back to you by themselves after 30 days, and you can take one back before then.</Row>
              <Row k="Not for US persons">Ondo and Etherfuse offer these to people outside the United States. Sending confirms the recipient is not a US person.</Row>
              <Row k="Cash">Sown moves no cash. The dollars arrive as USDC, which MoneyGram-connected Stellar wallets turn into cash in 170+ countries.</Row>
              <Row k="Unaudited">
                The contract and the wallet kit are unaudited. Keep amounts small. <Link href="/proof">The proof page</Link> shows the code&apos;s hash read from the ledger.
              </Row>
            </div>
          </Section>
        </div>
      </section>
      <p className="sw-sec sw-front-net">
        {deployment(net.name) ? (
          <>
            The Sown contract on {net.name}: <span className="mono">{deployment(net.name)!.contractId}</span>
          </>
        ) : (
          <>Sown is not deployed on {net.name} yet.</>
        )}
      </p>
    </SiteFrame>
  );
}
