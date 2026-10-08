import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Envelope, type EnvelopeSection } from "@/components/envelope/envelope";
import { Row, Section, SiteFrame } from "@/components/site/site-frame";
import { assetLine } from "@/lib/assets/catalogue";
import { disclose } from "@/lib/assets/issuer-flags";
import { flagChips } from "@/lib/assets/disclosure";
import { readReceipt } from "@/lib/envelope/receipt";
import { fillPrice, headline, returnWords, sentTotal, stillHeld } from "@/lib/envelope/view";
import { bps, fromRaw, short, stampUTC, units, unitsExact, usdAligned } from "@/lib/format";
import { isPasskeyWallet } from "@/lib/passkey/is-wallet";
import { isTestnet } from "@/lib/site";
import { accountUrl, contractUrl, txUrl } from "@/lib/stellar/network";
import { envelopeIsTeam } from "@/lib/team";
import { SentSheet } from "./sent-sheet";
import "./receipt.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Envelope ${id}`, description: "A Sown receipt, read from the Sown contract's own record on the Stellar ledger." };
}

/**
 * THE PUBLIC RECEIPT. Unshelled and print-like: the envelope as the hero, then what was kept
 * and where it is anchored. Built from the contract's record and the transactions that wrote
 * it; nothing here comes from a database that the ledger does not also hold.
 */
export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string; claimed?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const r = await readReceipt(id);
  if (!r.ok) {
    if (/no envelope|not an envelope/i.test(r.why)) notFound();
    return (
      <SiteFrame>
        <section className="sw-sec">
          <div className="sw-col">
            <p className="sw-kicker">Envelope {id}</p>
            <h1 className="sw-h1">This receipt could not be read just now.</h1>
            <p className="sw-lede">{r.why}</p>
            <div className="sw-actions sw-receipt-actions">
              <Link href={`/receipt/${id}`} className="sw-btn is-primary">
                Read it again
              </Link>
            </div>
          </div>
        </section>
      </SiteFrame>
    );
  }
  const { envelope: e, asset, sendTx, claimTx, refundTx, minKeepOut, net, contractId } = r.value;
  const ticker = asset?.ticker ?? "units";
  const disclosure = asset ? await disclose(net, asset) : null;
  const passkey = e.state === "claimed" ? await isPasskeyWallet(net, e.claimedBy) : false;
  const team = envelopeIsTeam(e);
  const head = headline(e);
  const held = stillHeld(e, ticker);
  const price = fillPrice(e, ticker);
  const fresh = sp.sent === "1" || sp.claimed === "1";

  const rows: EnvelopeSection[] = [
    {
      rows: [
        { k: "Sent", v: <>{usdAligned(fromRaw(sentTotal(e)))} USDC by <a href={accountUrl(net, e.sender)}>{short(e.sender)}</a></> },
        { k: "Kept", v: e.keepIn > 0n ? `${bps(e.keepBps)} → ${units(e.keepOut)} ${ticker}` : "nothing" },
        ...(price ? [{ k: "Price", v: `${price} on Aquarius, pool fee ${bps(asset?.poolFeeBps ?? 0)}` }] : []),
        ...(minKeepOut !== null && minKeepOut > 0n ? [{ k: "At the least", v: `${units(minKeepOut)} ${ticker}` }] : []),
        { k: "To spend", v: usdAligned(fromRaw(e.cash)) },
      ],
    },
    {
      rows: [
        e.state === "claimed"
          ? { k: "Claimed", v: <>{stampUTC(e.claimedAt)} by <a href={accountUrl(net, e.claimedBy ?? "")}>{short(e.claimedBy ?? "")}</a>{passkey ? ", a wallet made with Face ID" : ""}</> }
          : e.state === "returned"
            ? { k: "Returned", v: stampUTC(e.claimedAt), tone: "muted" as const }
            : { k: "Waiting", v: `returns by itself on ${stampUTC(e.returnAt).replace(/, \d\d:\d\d UTC$/, "")}`, tone: "warn" as const },
        { k: "Still held", v: held.text, tone: held.tone },
        { k: "Send", v: sendTx ? <a href={txUrl(net, sendTx.hash)}>{short(sendTx.hash, 4, 4)}</a> : "older than the network's history", tone: sendTx ? undefined : ("muted" as const) },
        ...(claimTx ? [{ k: "Claim", v: <a href={txUrl(net, claimTx.hash)}>{short(claimTx.hash, 4, 4)}</a> }] : []),
        ...(refundTx ? [{ k: "Return", v: <a href={txUrl(net, refundTx.hash)}>{short(refundTx.hash, 4, 4)}</a> }] : []),
      ],
    },
  ];

  return (
    <SiteFrame send={!(sp.sent === "1" && e.state === "open")}>
      <section className="sw-sec sw-receipt">
        <h1 className="sw-sr">
          Envelope {id}: {usdAligned(fromRaw(sentTotal(e)))} sent, {e.keepIn > 0n ? `${bps(e.keepBps)} kept as ${units(e.keepOut)} ${ticker}` : "nothing kept"}, {e.state === "open" ? "waiting" : e.state}
        </h1>
        <div className="sw-receipt-hero">
          <Envelope
            kicker={head.kicker}
            tone={head.tone}
            sent={<><strong>{usdAligned(fromRaw(sentTotal(e)))}</strong> sent</>}
            became={e.keepIn > 0n ? `${bps(e.keepBps)} kept as` : "nothing kept"}
            units={units(e.keepOut)}
            symbol={ticker}
            assetLine={asset ? assetLine(asset) : undefined}
            when={stampUTC(e.createdAt)}
            where={
              e.state === "claimed" ? (
                <>to {passkey ? "a wallet made with Face ID" : <span className="addr">{short(e.claimedBy ?? "")}</span>}</>
              ) : e.state === "returned" ? (
                "back to the sender"
              ) : (
                "waiting for the recipient"
              )
            }
            sections={rows}
            tag={[team ? "team" : null, isTestnet() ? "testnet" : null].filter(Boolean).join(" · ") || undefined}
            printing={fresh}
            foot={<>Envelope {e.id.toString()} on the Sown contract. {e.state === "open" ? returnWords(e) : null}</>}
          />
        </div>
        <div className="sw-receipt-side">
          {sp.sent === "1" && e.state === "open" ? <SentSheet id={e.id.toString()} claimKeyHex={e.claimKeyHex} amount={usdAligned(fromRaw(sentTotal(e)))} /> : null}
          {sp.sent !== "1" && e.state === "open" ? (
            <div className="sw-note is-warn">
              Waiting for the recipient. The claim link is not on this page: it lives only in the sender&apos;s browser and the message they sent. {returnWords(e)}
            </div>
          ) : null}
          {e.state === "returned" ? <div className="sw-note">{returnWords(e)}</div> : null}
          <Section label="What was kept">
            <div className="sw-truths">
              <Row k="Asset">{asset ? `${asset.fullName}` : <span className="mono">{e.keepAsset}</span>}</Row>
              <Row k="Issuer">{disclosure ? disclosure.sentence : "Not on Sown's list for this network."}</Row>
              {disclosure?.asset.issuer ? (
                <Row k="Read from the ledger">
                  {flagChips(disclosure.flags, true).join(" · ")}
                  {disclosure.flags?.readAt ? ` (issuer account, read ${stampUTC(disclosure.flags.readAt)})` : ""}
                </Row>
              ) : null}
              <Row k="Raw units">
                <span className="mono">
                  {unitsExact(e.keepOut)} {ticker} for {unitsExact(e.keepIn)} USDC
                </span>
              </Row>
            </div>
          </Section>
          <Section label="Where it is anchored">
            <div className="sw-truths">
              <Row k="Contract">
                <a href={contractUrl(net, contractId)} className="mono">
                  {contractId}
                </a>
              </Row>
              <Row k="Envelope">
                <span className="mono">get({e.id.toString()})</span>
              </Row>
              <Row k="Ledgers">
                <span className="mono">
                  sent {e.createdLedger.toLocaleString("en-US")}
                  {e.claimedLedger ? ` · ${e.state === "claimed" ? "claimed" : "returned"} ${e.claimedLedger.toLocaleString("en-US")}` : ""}
                </span>
              </Row>
              <Row k="Network">{net.name === "testnet" ? "Stellar testnet. Test USDC and the XLM stand-in have no value." : "Stellar mainnet"}</Row>
            </div>
          </Section>
          <p className="sw-receipt-foot">
            This page is built from the Sown contract&apos;s own record on the Stellar ledger, not from our database. Every figure is a value anyone can read back.
          </p>
        </div>
      </section>
    </SiteFrame>
  );
}
