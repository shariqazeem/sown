import type { Metadata } from "next";
import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { Row, Section, SiteFrame } from "@/components/site/site-frame";
import { deployment } from "@/lib/deployments";
import { REPO_URL } from "@/lib/site";
import { contractUrl, network } from "@/lib/stellar/network";
import "./judges.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "For the judges", robots: { index: false, follow: false } };

/**
 * ONE LINK FOR THE SUBMISSION FORM, which takes exactly one. Everything a judge needs in two
 * minutes: the product, the video, the contract, two receipts, the code, and the real envelopes
 * left open for them. The claim links come from the server's environment (SOWN_JUDGE_LINKS,
 * comma-separated), never from the repository: a link is the money, and the first to tap it keeps it.
 */
function env(name: string): string | null {
  const v = process.env[name]?.trim();
  return v ? v : null;
}

export default function JudgesPage() {
  const net = network();
  const d = deployment(net.name);
  const video = env("SOWN_VIDEO_URL");
  const filmed = env("SOWN_FILM_RECEIPT_ID");
  const claims = (env("SOWN_JUDGE_LINKS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https:\/\//.test(s));
  return (
    <SiteFrame send={false}>
      <section className="sw-sec">
        <div className="sw-col">
          <p className="sw-kicker">For the judges</p>
          <h1 className="sw-h1">Sown in two minutes, with real money.</h1>
          <p className="sw-lede">
            Send money home. Part of it stays theirs. A sender keeps a slice of every send as US Treasuries in the recipient&apos;s own wallet, claimed with Face ID, on Stellar mainnet, with a receipt read from the ledger.
          </p>
        </div>

        {claims.length > 0 ? (
          <div className="sw-judges-claims">
            <h2 className="sw-h2">Be the recipient: a real envelope is waiting for you</h2>
            <p className="sw-body">Each link below opens a real $1 envelope on mainnet. Tap one on your phone, tap &ldquo;Claim with Face ID&rdquo;, and a wallet only you control holds the dollars and the US Treasuries a minute later. The first to tap a link keeps it; if one says claimed, take the next.</p>
            <div className="sw-judges-grid">
              {claims.map((href, i) => (
                <a key={href} href={href} className="sw-btn is-primary sw-judges-claim">
                  <Fingerprint size={18} strokeWidth={2} aria-hidden />
                  Open envelope {String.fromCharCode(65 + i)} and claim it
                </a>
              ))}
            </div>
            <p className="sw-judges-fine">On a laptop without Touch ID the page shows a QR to open it on your phone. Any Stellar wallet can claim too.</p>
          </div>
        ) : null}

        <div className="sw-judges-cols">
          <Section label="Watch, then try">
            <div className="sw-truths">
              {video ? (
                <Row k="The pitch">
                  <a href={video} className="sw-link">
                    Three minutes: a real send on a laptop, a real claim with Face ID on a phone
                  </a>
                </Row>
              ) : null}
              <Row k="The product">
                <Link href="/" className="sw-link">
                  sown.world
                </Link>{" "}
                on mainnet. The card quotes the real Aquarius pool; with Freighter, xBull, LOBSTR or Hana holding USDC you can send one yourself.
              </Row>
              <Row k="Your wallet">
                After a claim,{" "}
                <Link href="/mine" className="sw-link">
                  your wallet
                </Link>{" "}
                shows what you hold in your own money, lets you move it to any Stellar address with one Face ID, and links the wallets that turn it into cash. Add it to your home screen and it opens behind your face.
              </Row>
            </div>
          </Section>

          <Section label="Read it from the ledger">
            <div className="sw-truths">
              {filmed ? (
                <Row k="The envelope from the video">
                  <Link href={`/receipt/${filmed}`} className="sw-link">
                    /receipt/{filmed}
                  </Link>
                  : sent from the founder&apos;s wallet, claimed on a phone with Face ID, every figure read from the contract.
                </Row>
              ) : null}
              <Row k="The mainnet smoke">
                <Link href="/receipt/0" className="sw-link">
                  /receipt/0
                </Link>
                : a dollar into real USDY, claimed into a wallet made the way a face makes one, moved back. Every hash in the repository.
              </Row>
              <Row k="The proof page">
                <Link href="/proof" className="sw-link">
                  /proof
                </Link>
                : the contract&apos;s code hash matching the repository, the one power the admin has, what Sown&apos;s servers hold and pay, every envelope.
              </Row>
              {d ? (
                <Row k="The contract">
                  <a href={contractUrl(net, d.contractId)} className="sw-link mono">
                    {d.contractId}
                  </a>
                </Row>
              ) : null}
              <Row k="The code">
                <a href={REPO_URL} className="sw-link">
                  {REPO_URL.replace(/^https?:\/\//, "")}
                </a>
                : MIT; 23 contract tests, 146 offline tests, the relay&apos;s checks tested against recorded transactions; a README with the two-minute path and the architecture.
              </Row>
            </div>
          </Section>
        </div>

        <Section label="Why only Stellar">
          <div className="sw-truths">
            <Row k="Real government debt">Ondo USDY, Etherfuse USTRY and CETES trade on Aquarius against USDC, about $2M deep each. The keep is bought there, inside the send, by the Sown contract itself, at a price the sender saw first.</Row>
            <Row k="A wallet from a face">OpenZeppelin&apos;s account contracts, deployed on the spot by Sown&apos;s servers; the recipient&apos;s Face ID is the only key.</Row>
            <Row k="Nothing to pay at home">Sown&apos;s servers pay the network for the wallet and the claim, after inspecting the exact shape of what they are asked to pay for, once per envelope.</Row>
            <Row k="Honest by construction">Issuer powers read from the chain on every row; no return promised anywhere; the note sealed by its hash; still-held measured by the contract at 30 days; the receipt is the ledger entry itself.</Row>
            <Row k="Cash on the other end">USDC on Stellar is what MoneyGram-connected wallets turn into cash in 170+ countries; Sown links to them and moves no cash itself.</Row>
          </div>
        </Section>
      </section>
    </SiteFrame>
  );
}
