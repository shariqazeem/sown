import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Envelope } from "@/components/envelope/envelope";
import { SplitScene } from "@/components/front/split";
import { Steps } from "@/components/front/steps";
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
 * THE FRONT DOOR. An evergreen hero with the headline beside the send card; then what happens
 * to $100, how it works, what they keep, one real envelope, why only Stellar, and what to know
 * before sending. Every figure on it is the pool's own quote or the contract's own record.
 */
export default async function Home() {
  const net = network();
  const [assets, q, latest, price] = await Promise.all([cardAssets(), openingQuote(), latestOutsideTeam(), xlmUsd()]);
  const deployed = !!deployment(net.name);
  const testnet = isTestnet();
  const testWallet = testnet && process.env.NEXT_PUBLIC_SOWN_TEST_WALLET === "1";
  const first = assets[0];
  const latestAsset = latest ? assets.find((a) => a.sac === latest.keepAsset) : null;

  return (
    <SiteFrame hero send={false}>
      <section className="sw-hero">
        <div className="sw-hero-in">
          <div className="sw-hero-words">
            <p className="sw-hero-eyebrow">
              <span className="sw-hero-dot" aria-hidden />
              {testnet ? "On Stellar testnet: test dollars, nothing of value" : "Live on Stellar"}
            </p>
            <h1 className="sw-display">
              Send money home. <em>Part of it stays theirs.</em>
            </h1>
            <p className="sw-lede">Send dollars as you do. A slice becomes US Treasuries in their own wallet, claimed with their face. A receipt for both.</p>
            <ul className="sw-hero-points">
              <li>
                <Check size={16} strokeWidth={3} aria-hidden />
                One approval, in the wallet you already use
              </li>
              <li>
                <Check size={16} strokeWidth={3} aria-hidden />
                They claim with Face ID. No app, nothing to pay
              </li>
              <li>
                <Check size={16} strokeWidth={3} aria-hidden />
                A receipt anyone can open, read from the ledger
              </li>
            </ul>
            <p className="sw-hero-line">Remittances are spent the week they arrive. Sown makes part of every one stay.</p>
          </div>
          <div className="sw-hero-card">
            <SendCard assets={assets} initialQuote={q} passphrase={net.passphrase} testnet={testnet} xlmUsd={price} deployed={deployed} testWallet={testWallet} />
          </div>
        </div>
      </section>

      <section className="sw-sec sw-front-sec">
        <div className="sw-front-head">
          <p className="sw-kicker">What happens to $100</p>
          <h2 className="sw-h2">Most of it is spent. Some of it is planted.</h2>
          <p className="sw-body">The sender chooses the keep. The slice is bought on Aquarius inside the same transaction, at a price the sender saw first, or nothing happens at all.</p>
        </div>
        {first ? (
          <SplitScene
            usd={100}
            cash={q ? fromRaw(q.cashRaw) : 90}
            keepUsd={q ? fromRaw(q.keepInRaw) : 10}
            keepBps={1_000}
            unitsOut={q && q.keepOutRaw !== "0" ? units(q.keepOutRaw) : null}
            ticker={first.ticker}
            assetLine={first.standIn ? "XLM, standing in for US Treasuries on testnet" : first.fullName}
            ledger={q?.ledger ?? null}
            standIn={first.standIn}
            quoted={!!q}
          />
        ) : null}
      </section>

      <section className="sw-sec sw-front-sec" id="how">
        <div className="sw-front-head">
          <p className="sw-kicker">How Sown works</p>
          <h2 className="sw-h2">Three steps. One signature. Nothing to install at home.</h2>
        </div>
        <Steps />
      </section>

      <section className="sw-sec sw-front-sec sw-two">
        <div>
          <p className="sw-kicker">What they keep</p>
          <h2 className="sw-h2">Government debt that already trades on Stellar.</h2>
          <p className="sw-body">Held as a balance in their own wallet. What each issuer can do is read from the ledger on every row, not from a brochure. No return is promised, because nobody can promise one.</p>
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
          <div className="sw-asset-row is-next">
            <p className="name">
              Stocks and ETFs held at DTC <span className="tick">expected first half of 2027</span>
            </p>
            <p className="line">DTCC chose Stellar to carry stocks, ETFs and Treasuries held at DTC. When they land, a stock becomes a row here: same send, same receipt. Not on Stellar yet, so no price is shown.</p>
          </div>
        </div>
      </section>

      <section className="sw-sec sw-front-sec sw-two">
        <div>
          <p className="sw-kicker">{latest ? "A real envelope" : "What a receipt looks like"}</p>
          <h2 className="sw-h2">{latest ? "Sent, kept, claimed. Read from the contract." : "Every send prints a receipt."}</h2>
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
              symbol={latestAsset?.ticker ?? "units"}
              assetLine={latestAsset?.fullName}
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

      <section className="sw-sec sw-front-sec">
        <div className="sw-front-head">
          <p className="sw-kicker">Why this only works on Stellar</p>
          <h2 className="sw-h2">The pieces already live here. Sown puts them in one transaction.</h2>
        </div>
        <ul className="sw-why">
          <li>
            <p className="t">Real government debt, with real depth</p>
            <p className="d">Ondo USDY, Etherfuse USTRY and CETES trade on Aquarius against USDC, about $2M deep each. The keep is bought there, inside the send, by the Sown contract itself.</p>
          </li>
          <li>
            <p className="t">A wallet from a face</p>
            <p className="d">OpenZeppelin&apos;s account contracts, deployed on the spot by Sown&apos;s servers. The recipient&apos;s Face ID is the only key; nobody at Sown can open it.</p>
          </li>
          <li>
            <p className="t">Nothing to pay at home</p>
            <p className="d">Sown&apos;s servers pay the network for the wallet and the claim, after checking the exact shape of what they are asked to pay for. The recipient needs no XLM, ever.</p>
          </li>
          <li>
            <p className="t">Cash on the other end</p>
            <p className="d">The dollars arrive as USDC, which MoneyGram-connected Stellar wallets turn into cash at agents in 170+ countries. Sown links to them; it moves no cash itself.</p>
          </li>
          <li>
            <p className="t">Stock next, on the same rail</p>
            <p className="d">DTCC chose Stellar to carry stocks, ETFs and Treasuries held at DTC, expected in 2027. Sown&apos;s catalogue is a list of what can be kept; a stock is one row away.</p>
          </li>
          <li>
            <p className="t">A receipt that lives in the ledger</p>
            <p className="d">The envelope is written by the send itself and updated by the claim. Thirty days later anyone can measure whether the keep is still held, and the receipt says so.</p>
          </li>
        </ul>
        <p className="sw-front-cta">
          <Link href="/proof" className="sw-btn">
            The proof page, read from the chain
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
          </Link>
        </p>
      </section>

      <section className="sw-sec sw-front-sec">
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
