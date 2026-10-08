import type { Metadata } from "next";
import Link from "next/link";
import { EnvelopeRow } from "@/components/envelope/envelope";
import { Row, Section, SiteFrame } from "@/components/site/site-frame";
import { assetRows } from "@/lib/assets/rows";
import { stillHeld } from "@/lib/envelope/view";
import { evidenceFor } from "@/lib/evidence";
import { bps, dateUTC, fromRaw, short, units, usdAligned } from "@/lib/format";
import { readProof } from "@/lib/proof";
import { REPO_URL } from "@/lib/site";
import { accountUrl, contractUrl, txUrl } from "@/lib/stellar/network";
import { envelopeIsTeam } from "@/lib/team";
import "./proof.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Proof", description: "The Sown contract, its code, its admin, what Sown's servers pay, and every envelope, read from the Stellar ledger." };

/** /proof — the one dark surface. Every figure read from the chain as the page loads. */
export default async function ProofPage() {
  const p = await readProof();
  const rows = await assetRows(p.net.name);
  const d = p.deployment;
  const all = p.envelopes.ok ? p.envelopes.value : [];
  const measured = all.filter((e) => e.measuredAt > 0);
  const firstClaim = all.filter((e) => e.state === "claimed").sort((a, b) => a.claimedAt - b.claimedAt)[0];
  const tickers = Object.fromEntries(rows.map((r) => [r.asset.sac, r.asset.ticker]));
  const evidence = evidenceFor(p.net.name);

  return (
    <SiteFrame current="proof" ink>
      <section className="sw-sec">
        <div className="sw-col">
          <p className="sw-kicker">Proof · {p.net.name}</p>
          <h1 className="sw-display sw-proof-title">The proof, read from the chain.</h1>
          <p className="sw-lede">Every figure on this page was read from the Stellar ledger as it loaded. None of it comes from Sown&apos;s database.</p>
        </div>

        <div className="sw-proof-counts" aria-label="Counts">
          {p.counts ? (
            <>
              <Count n={p.counts.sent} label="envelopes sent" />
              <Count n={p.counts.claimed} label="claimed" />
              <Count n={p.counts.returned} label="returned" />
              <Count n={p.counts.open} label="waiting" />
              <Count n={p.counts.outsideTeam} label="from outside the team" />
              <div className="sw-proof-count is-word">
                <span className="n">Unaudited</span>
                <span className="l">the contract and the wallet kit</span>
              </div>
            </>
          ) : (
            <p className="sw-body">{p.envelopes.ok ? "" : p.envelopes.why}</p>
          )}
        </div>

        <div className="sw-proof-grid">
          <Section label="The contract">
            <div className="sw-truths">
              {d ? (
                <>
                  <Row k="Address">
                    <a href={contractUrl(p.net, d.contractId)} className="mono">
                      {d.contractId}
                    </a>
                  </Row>
                  <Row k="Code on the ledger">
                    {p.code.ok ? (
                      <>
                        <span className="mono">{p.code.value.sha256}</span>
                        <span className={`sw-proof-match ${p.builtSha256 === p.code.value.sha256 ? "is-ok" : "is-err"}`}>
                          {p.builtSha256 === p.code.value.sha256 ? `the same bytes as artifacts/sown.wasm in the repository (${p.code.value.bytes.toLocaleString("en-US")} bytes)` : "does NOT match artifacts/sown.wasm"}
                        </span>
                      </>
                    ) : (
                      p.code.why
                    )}
                  </Row>
                  <Row k="Check it yourself">
                    <code className="sw-proof-cmd">
                      stellar contract fetch --id {short(d.contractId, 6, 6)} --network {p.net.name} --out-file sown.wasm && shasum -a 256 sown.wasm
                    </code>
                  </Row>
                  <Row k="Deployed">
                    {dateUTC(Math.floor(new Date(d.deployedAt).getTime() / 1000))}, ledger {d.ledger.toLocaleString("en-US")},{" "}
                    <a href={txUrl(p.net, d.deployTx)} className="mono">
                      {short(d.deployTx)}
                    </a>
                    . No upgrade function exists.
                  </Row>
                </>
              ) : (
                <Row k="Not yet">Sown is not deployed on {p.net.name} yet.</Row>
              )}
            </div>
          </Section>

          <Section label="Who can do what">
            <div className="sw-truths">
              {d ? (
                <Row k="The admin">
                  <a href={accountUrl(p.net, d.admin)} className="mono">
                    {short(d.admin)}
                  </a>{" "}
                  can add a keep asset, or disable one for future sends, and nothing else. It cannot pause the contract, upgrade it, or move an envelope: no function lets it.
                </Row>
              ) : null}
              <Row k="The sender">can take an envelope back any time before it is claimed. After its return date, anyone can send it back to the sender, and only to the sender.</Row>
              <Row k="The link">is the only key to an envelope: its holder signs which wallet receives it. The secret never reaches Sown&apos;s servers or the ledger.</Row>
              <Row k="Sown's servers">
                {p.servers.ok ? (
                  <>
                    <a href={accountUrl(p.net, p.servers.value.address)} className="mono">
                      {short(p.servers.value.address)}
                    </a>{" "}
                    pay the network for recipients: their wallets, their claims, and the XLM a classic wallet must set aside to hold them. They hold {p.servers.value.xlm.toLocaleString("en-US", { maximumFractionDigits: 2 })} XLM, have paid{" "}
                    {(Number(p.servers.value.feesPaidStroops) / 1e7).toLocaleString("en-US", { maximumFractionDigits: 4 })} XLM in fees over {p.servers.value.txs}
                    {p.servers.value.capped ? "+" : ""} transactions, and have set aside {p.servers.value.reservesHeld} XLM so classic wallets can hold what they claimed ({p.servers.value.sponsoring} entries; it comes back when a wallet lets go of one). They sign nothing they have not checked, and can move no envelope.
                  </>
                ) : (
                  p.servers.why
                )}
              </Row>
            </div>
          </Section>

          <Section label="The pools Sown buys from">
            <div className="sw-truths">
              {rows.map((r) => (
                <Row key={r.asset.key} k={r.asset.standIn ? "XLM (stand-in)" : r.asset.ticker}>
                  <a href={contractUrl(p.net, r.asset.pool)} className="mono">
                    {short(r.asset.pool)}
                  </a>{" "}
                  {r.reserves ? `holds ${units(r.reserves[1], 2)} ${r.asset.ticker} and ${units(r.reserves[0], 2)} USDC` : "did not answer just now"}, fee {r.asset.poolFeeBps / 100}%. {r.sentence}
                </Row>
              ))}
            </div>
          </Section>

          <Section label="Still held">
            {measured.length > 0 ? (
              <div className="sw-truths">
                {measured.map((e) => {
                  const h = stillHeld(e, tickers[e.keepAsset] ?? "units");
                  return (
                    <Row key={e.id.toString()} k={`Envelope ${e.id}`}>
                      <span className="sw-proof-held">{h.text}</span>
                    </Row>
                  );
                })}
              </div>
            ) : (
              <p className="sw-body">
                Thirty days after a claim, anyone can call measure(id): the contract reads the keep&apos;s balance in the wallet that claimed it and writes it into the receipt.
                {firstClaim ? ` The first can be measured on ${dateUTC(firstClaim.claimedAt + 30 * 86_400)}.` : " Nothing has been claimed yet."}
              </p>
            )}
          </Section>
        </div>

        <Section label="Every envelope, newest first" aside={p.counts ? `${p.counts.sent} on the contract` : undefined}>
          {all.length === 0 ? (
            <p className="sw-body">{p.envelopes.ok ? "No envelope has been sent yet. The first one prints here." : p.envelopes.why}</p>
          ) : (
            <div className="sw-proof-rows">
              {all.slice(0, 40).map((e) => (
                <EnvelopeRow
                  key={e.id.toString()}
                  href={`/receipt/${e.id}`}
                  state={e.state === "open" ? "waiting" : e.state}
                  amount={usdAligned(fromRaw(e.cash + e.keepIn))}
                  keep={e.keepIn > 0n ? `${bps(e.keepBps)} kept as ${units(e.keepOut)} ${tickers[e.keepAsset] ?? "units"}` : "nothing kept"}
                  date={dateUTC(e.createdAt)}
                  tag={envelopeIsTeam(e) ? "team" : undefined}
                />
              ))}
            </div>
          )}
        </Section>

        {evidence ? (
          <Section label={evidence.label} aside={evidence.at ? dateUTC(Math.floor(new Date(evidence.at).getTime() / 1000)) : undefined}>
            <div className="sw-truths">
              {evidence.film ? (
                <Row k={`Envelope ${evidence.film.id}, on film`}>
                  ${evidence.film.amount}, {bps(evidence.film.keepBps)} kept as {evidence.film.asset}, claimed into {evidence.film.into}, {evidence.film.secondsFromSendToClaim} seconds from send to claim on the ledger.{" "}
                  {evidence.film.sendTx ? (
                    <a href={txUrl(p.net, evidence.film.sendTx)} className="mono">
                      {short(evidence.film.sendTx)}
                    </a>
                  ) : null}{" "}
                  {evidence.film.claimTx ? (
                    <a href={txUrl(p.net, evidence.film.claimTx)} className="mono">
                      {short(evidence.film.claimTx)}
                    </a>
                  ) : null}
                </Row>
              ) : null}
              {evidence.steps.map((s, i) => (
                <Row key={i} k={s.name}>
                  <a href={txUrl(p.net, s.hash)} className="mono">
                    {short(s.hash)}
                  </a>
                </Row>
              ))}
            </div>
          </Section>
        ) : null}

        <p className="sw-proof-links">
          <Link href="/docs/why-not-claimable-balances" className="sw-link">
            Why not claimable balances
          </Link>
          <Link href="/docs/fees" className="sw-link">
            Fees, and who pays them
          </Link>
          <a href={REPO_URL} className="sw-link">
            The code
          </a>
        </p>
      </section>
    </SiteFrame>
  );
}

function Count({ n, label }: { n: number; label: string }) {
  return (
    <div className="sw-proof-count">
      <span className="n">{n.toLocaleString("en-US")}</span>
      <span className="l">{label}</span>
    </div>
  );
}
