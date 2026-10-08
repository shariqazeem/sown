import Link from "next/link";
import type { ReactNode } from "react";

/**
 * THE DOCS — six short pages, facts stated, each true of the code in this repository. The order
 * here is the order of the docs index; a test holds every /docs link in the app to these slugs.
 */
export type Doc = { readonly slug: string; readonly title: string; readonly lede: string; readonly body: ReactNode };

const C = ({ children }: { children: ReactNode }) => <code className="sw-doc-code">{children}</code>;

export const DOCS: readonly Doc[] = [
  {
    slug: "how-a-send-works",
    title: "How a send works",
    lede: "One approval in the sender's wallet does the send and the keep, in one Stellar transaction.",
    body: (
      <>
        <p>
          The sender chooses an amount in USDC and a keep, 10% unless they say otherwise. Sown asks the Aquarius pool what the keep would buy right now, by simulating the pool&apos;s own
          <C>estimate_swap</C>, and shows the least it may become: that estimate less 1%.
        </p>
        <p>
          The wallet signs one transaction that calls <C>send</C> on the Sown contract. Inside it, the contract takes the USDC from the sender, swaps the keep on the Aquarius pool, counts
          the units that actually arrived, and refuses the whole send if they are fewer than the least the sender saw. If anything fails, nothing moves.
        </p>
        <p>
          The contract authorises the pool to pull exactly the keep from it (<C>authorize_as_current_contract</C>), so the sender&apos;s one signature is enough. Both parts then wait in an
          envelope on the contract, and the send prints a receipt anyone can open.
        </p>
        <p>
          The sender&apos;s browser makes the link&apos;s secret. It never goes to Sown&apos;s servers; the envelope stores only its public half. The sender shares the link, on WhatsApp or anywhere.
        </p>
      </>
    ),
  },
  {
    slug: "the-envelope",
    title: "The envelope",
    lede: "The waiting room between the send and the claim: a record on the Sown contract that only the link opens.",
    body: (
      <>
        <p>
          Each envelope is a persistent entry on the contract: who sent it, the cash, the keep asset, the USDC that went in and the units that came out, the rate, the public key of the
          link&apos;s secret, when it was sent, when it goes back by itself, and its state: open, claimed or returned.
        </p>
        <p>
          <strong>Claiming.</strong> Whoever holds the link signs a short message naming the envelope and the wallet that should receive it. The contract checks that signature against the
          key it stored and pays both parts to that wallet. Because the signature names the wallet, nobody who sees the claim can redirect it, and the secret itself never appears on the
          ledger.
        </p>
        <p>
          <strong>A wallet made with Face ID.</strong> A recipient with no wallet taps &ldquo;Claim with Face ID&rdquo;. Their phone makes a passkey, and the Smart Account Kit turns it into a
          smart account on Stellar (OpenZeppelin&apos;s account contract) that only that passkey controls. Sown&apos;s servers deploy it and submit the claim, so the recipient pays nothing and
          needs no XLM.
        </p>
        <p>
          <strong>Taking it back.</strong> The sender can take an envelope back any time before it is claimed. After its return date (30 days unless the sender chose another), anyone can send
          it back to the sender, and only to the sender.
        </p>
        <p>
          <strong>Still held.</strong> Thirty days after a claim, anyone can call <C>measure(id)</C>: the contract reads the keep&apos;s balance in the wallet that claimed it and writes it into
          the envelope, once.
        </p>
      </>
    ),
  },
  {
    slug: "why-not-claimable-balances",
    title: "Why not claimable balances",
    lede: "A claimable balance is the Stellar way to pay someone who is not there yet. Sown cannot use it for the people it is for.",
    body: (
      <>
        <p>
          Only a classic Stellar account can claim a claimable balance, and the person Sown most needs to reach has no account at all. Their new wallet is a passkey smart account: a
          contract, which cannot claim one.
        </p>
        <p>
          A classic payment cannot go to a contract address either, and it cannot write the receipt. So the envelope is a contract entry: the smart-account-era claimable balance, with the
          keep bought inside the same transaction and the receipt written beside it.
        </p>
        <p>For someone who already has a classic wallet, a native claimable-balance path is on the roadmap.</p>
      </>
    ),
  },
  {
    slug: "what-the-issuer-can-do",
    title: "What the issuer can do",
    lede: "A kept balance is issued by someone. What they can do to it is written on their account, and Sown reads it there.",
    body: (
      <>
        <p>
          Every Stellar issuer account carries flags. <strong>Revocable</strong> means the issuer can freeze a holder&apos;s balance. <strong>Clawback enabled</strong> means the issuer can
          take a balance back. <strong>Auth required</strong> means the issuer must approve each holder before they can hold it.
        </p>
        <p>
          On 8 October 2026, Ondo&apos;s USDY issuer and Etherfuse&apos;s USTRY and CETES issuer were revocable and clawback enabled, and did not require approval. Sown never writes this down
          by hand: every asset row reads the flags from the issuer&apos;s account when the page loads, so a change tomorrow changes the sentence.
        </p>
        <p>
          Ondo and Etherfuse offer these to people outside the United States. Sending confirms the recipient is not a US person. The price of each is the pool&apos;s, and it can fall.{" "}
          <Link href="/assets">Every asset, read now</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "fees",
    title: "Fees, and who pays them",
    lede: "The sender pays the network for the send. Sown's servers pay for everything the recipient does.",
    body: (
      <>
        <p>
          <strong>The send</strong> is the sender&apos;s transaction, and its fee comes from their wallet in XLM. Most of it is rent that keeps the envelope in the ledger for about six
          months; measured on mainnet&apos;s rates on 8 October 2026, that is about 0.2 XLM. The confirm sheet shows the fee from the transaction&apos;s own simulation before the wallet opens.
        </p>
        <p>
          <strong>The claim</strong> is paid by Sown&apos;s servers: the recipient&apos;s new wallet (about 0.2 XLM on mainnet), the claim itself (about 0.09 XLM), and, for a classic
          wallet, the half XLM per asset it must set aside to hold USDC and the keep, plus the one XLM every Stellar account keeps when the wallet is brand new. Those deposits come back
          when the wallet lets go of them. Sown&apos;s servers check each request against an exact shape before they sign, pay for an envelope once, and cannot move an envelope.
        </p>
        <p>
          <strong>Moving out</strong> of a wallet made with Face ID is paid by Sown&apos;s servers too, a few times a day. The <Link href="/proof">proof page</Link> shows what they hold and
          everything they have paid, read from the ledger.
        </p>
        <p>
          <strong>Sown takes nothing.</strong> The pool charges its own fee on the keep (0.1% or 0.3%), shown on every receipt.
        </p>
      </>
    ),
  },
  {
    slug: "the-limits",
    title: "The limits",
    lede: "What Sown is not, and the numbers it holds to.",
    body: (
      <>
        <p>
          <strong>Amounts.</strong> A send is at least $1. An envelope goes back by itself between one day and one year after it is sent. The least a keep can become is fixed when the
          sender signs.
        </p>
        <p>
          <strong>Not a remittance company.</strong> Sown moves no cash. The dollars arrive as USDC, which MoneyGram-connected Stellar wallets turn into cash; Sown links to them.
        </p>
        <p>
          <strong>Unaudited.</strong> The Sown contract has no audit, and the Smart Account Kit calls itself unaudited integration software. Keep amounts small. The contract has no upgrade
          function; its admin can add or disable a keep asset for future sends and nothing else.
        </p>
        <p>
          <strong>No promise of a return.</strong> Sown shows no rate of return, no projection and no chart. The only figures are what the ledger says: what was sent, what was kept, what is held.
        </p>
        <p>
          <strong>Every month</strong> is a reminder, not a standing order: Stellar has none yet. The roadmap puts the rule on the sender&apos;s own wallet, where the wallet enforces it.
        </p>
      </>
    ),
  },
];

export function docBySlug(slug: string): Doc | null {
  return DOCS.find((d) => d.slug === slug) ?? null;
}
