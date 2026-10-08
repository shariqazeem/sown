# Design

> Scrip's design system, carried over whole and adapted to one new object: the envelope. Read
> `webgold/.claude/skills/scrip-ui/SKILL.md` first; everything there holds unless this file
> says otherwise. Paper on every consumer screen; ink only on `/proof`. One accent. Green and
> red for money outcomes only. No emoji, no Tailwind utilities, sentence case, one primary
> button per screen, a trust line above every signature, nothing that moves except a receipt
> printing.

## Files to copy from webgold (read-only source; copy, then adapt)

| From `/Users/macbookair/projects/webgold/` | To | What changes |
| --- | --- | --- |
| `src/styles/tokens.css` | `src/styles/tokens.css` | nothing. The one source of every value |
| `src/components/stub/stub.tsx`, `stub.css` | `src/components/envelope/` | rename `Stub` → `Envelope`; `kicker` default "Sent on Stellar"; `ExampleStub` keeps "A worked example, not a receipt"; `GhostStub` becomes the **waiting** envelope (dashed) for "sent, not yet claimed" |
| `src/components/save/save.css`, `local-amount.tsx`, `use-local-money.ts`, `types.ts`, `wallets.ts` (the phone deep-link pattern) | `src/components/send/` | chips are amounts and keep rates; `wallets.ts` lists Stellar wallets and their mobile deep links |
| `src/components/save/save-now.tsx` | `src/components/send/send-card.tsx` | the card: amount, keep, asset, live quote, one button, the confirm sheet as a native `<dialog>` |
| `src/components/start/start-card.tsx` | reference only | the phase machine (`idle / building / signing / confirming / done / failed`) and `landedOrNot` polling |
| `src/components/toast/*` | `src/components/toast/` | the same words as the button |
| `src/components/app/offline.tsx`, `public/sw.js` | optional, Day 4 | — |
| `src/app/receipt/[sig]/page.tsx`, `receipt.css` | `src/app/receipt/[id]/` | built from `get(id)` and two transaction hashes instead of a Solana account |
| `src/app/receipt/[sig]/opengraph-image.tsx` | `src/app/receipt/[id]/opengraph-image.tsx` | the envelope as the share card |
| `src/lib/fx/*`, `src/app/api/fx/` | `src/lib/fx/` | nothing |
| `src/lib/format.ts` | `src/lib/format.ts` | 7 decimals; `usdc()`, `units()`, `short()` for G and C addresses |
| `src/lib/team.ts` | `src/lib/team.ts` | the founder's wallets, the sponsor, the smoke recipients: "Sown · team" on their receipts |
| `src/lib/solana/limiter.ts` | `src/lib/stellar/limiter.ts` | one gate per endpoint; RPC and Horizon |
| `components/site/home-nav.tsx`, `SiteFrame`, `SiteSection`, `Row` | `src/components/site/` | the paper nav: Sown, Assets, Proof, Docs, and "Your wallet" after a passkey session |

## The envelope, the one bold object

A white sheet on paper with a perforated top edge, ruled rows, and the **keep units as the
largest figure**. Five sizes, the same object:

1. **the row** — one line in `/sent` and on `/proof`
2. **the waiting envelope** — dashed, on `/r/<id>` before the claim: "Sent, waiting for you"
3. **the receipt** — the hero of `/receipt/<id>`
4. **the share card** — `opengraph-image`
5. **the worked example** — labelled arithmetic, on `/` before any real envelope exists

Head: a green dot and "Sent on Stellar" (or "Claimed on Stellar"), the Sown mark on the right.
Then: **$100.00** sent · *10% kept as* · **8.7709** USDY · "US Treasuries, Ondo" · the time ·
"to a wallet made with Face ID" / "to G…". Then ruled rows (see the receipt screen).

The motion: when a real envelope first appears (after a send, after a claim), it prints once —
`--dur-2` on `--ease-spring`. Nothing else moves.

## The words

| Say | Never |
| --- | --- |
| send, sent | transfer, remit, transaction (except on `/proof`) |
| keep, kept, "10% kept as US Treasuries" | save, invest, allocate |
| US Treasuries (Ondo USDY) · US Treasury notes (Etherfuse USTRY) · Mexican CETES (Etherfuse) | token, RWA, yield-bearing, APY, yield |
| the envelope; "waiting for you" | escrow, contract, claimable balance |
| claim; "Claim with Face ID"; "Claim with a Stellar wallet" | withdraw, redeem, sign |
| your wallet | smart account, passkey account |
| Face ID / fingerprint / "your face or fingerprint" | passkey, WebAuthn (docs only) |
| Sown's servers pay the network | relayer, sponsor, fee bump, gas |
| take it back (sender) · returned by itself (after the date) | refund, cancel, expire |
| still held, measured | keep-rate (code only) |
| the price on Aquarius right now | oracle, slippage (say "if the price moves more than 1% first, nothing happens") |
| in your money (PKR, NGN, PHP, MXN…) | FX, exchange rate |

Lines under 80 characters. Amounts lead; local money beside them in muted type, with the rate
and its date in the title attribute.

## Onboarding, counted

**Sender** (has Freighter):
1. tap an amount (or type) · 2. tap a keep rate (10% is selected) · 3. tap "Send $100" →
the confirm sheet · 4. tap "Approve in wallet" → **one wallet prompt** → the receipt and the
link. Three taps, one signature, one prompt. Connecting the wallet happens inside step 3 when
no wallet is remembered (one extra prompt the first time).

**Recipient** (has nothing):
1. tap the link in WhatsApp · 2. tap "Claim with Face ID" → **Face ID #1** (creates the
wallet) → **Face ID #2** (claims; the button reads "Claiming…" between the two) → the receipt
prints. Two taps, two biometric prompts, zero typing, zero downloads. If the browser cannot do
Face ID: one more tap, "Open in Safari".

**Recipient** (has a Stellar wallet): 1. tap the link · 2. "Claim with a Stellar wallet" →
choose the wallet → prompt 1 (two trustlines, paid by Sown) → prompt 2 (the claim) → the
receipt. Two prompts on a fresh wallet, one if the trustlines exist.

## Screens

### `/` — Send

**Layout.** Paper. The nav. Headline left, the send card right (stacked on a phone, card
first). Below: "How Sown works" in three rows, "What they can keep" (three asset rows with
disclosure), one real envelope (the latest claimed one outside the team, or the worked
example), "Before you send", a link to `/proof`.

**Headline.** "Send money home. Part of it stays theirs." Lede: "Send dollars as you do. Keep a
slice as US Treasuries, in their own wallet, claimable with their face. A receipt for both."

**The card.**
- *How much*: chips $25 · $50 · $100 · Other (inputMode decimal). Under it, when a wallet is
  connected: "This wallet holds $412.10 of USDC."
- *Keep*: chips 5% · **10%** · 20% · Other. Under it, the arithmetic line, live: "Keep $10.00
  → about **8.7709 USDY** (US Treasuries, Ondo). $90.00 to spend."
- *As*: chips US Treasuries (selected) · US Treasury notes · Mexican CETES; ticker and issuer in
  small type under the selected chip.
- *The live line* (aria-live): "$100 · ₨27,950 becomes $90.00 to spend and about 8.7709 USDY".
  While quoting: "Asking Aquarius for a price…". If the pool is unreachable: the sentence, no
  number, the button disabled.
- *The button*: "Send $100". Under it: "Uses the Stellar wallet you already have. Nothing
  moves until you approve it." / when connected: "From G5X2…K7PQ. Use another wallet."

**States.** *Empty* (no wallet): the card works and quotes; connecting happens on the button.
*Quoting*: the sentence. *Short of USDC*: the chip disabled with "holds $12.00" under the chips.
*Failed quote*: "Aquarius did not answer. Try again in a moment." *No wallet installed* (on the
button): the sheet lists Freighter, xBull, LOBSTR, Hana with install links; on a phone, "Open
in Freighter" / "Open in LOBSTR" deep links carrying this URL.

### The confirm sheet (a native `<dialog>`, a bottom sheet on a phone)

Title "Send $100". Then the outcome first, largest: *From this wallet* $100.00 USDC · *They
get* $90.00 to spend **and** about 8.7709 USDY (US Treasuries, Ondo), into a wallet of their
own. Then facts as `<dl>`: *At the least* 8.6832 USDY — if the price moves more than 1% first,
nothing happens and nothing is spent · *Network fee* about $0.001 in XLM, from your wallet ·
*Returned by itself* on 7 Nov 2026 if nobody claims it; you can take it back any time before ·
*The issuer* "Ondo issues USDY and can freeze this balance or take it back; it needs no
permission to hold. Not for US persons." with a `<details>` "Everything about USDY". Then,
pinned above the button, the trust line: "The money goes to the Sown contract until they
claim it. Nobody at Sown can move it. Sending confirms the recipient is not a US person." The
button: "Approve $100 in wallet" → "Preparing…" → "Approve in your wallet…" → "Sending on
Stellar…" → on failure "Try again" with the reason in one sentence and "Nothing moved."

### After the send — `/receipt/<id>?sent=1`

The envelope prints. Head "Sent on Stellar · just now". Under it, in a sheet that cannot be
missed: **the link**, large, with "Copy" and "Share on WhatsApp", and the line "Anyone with
this link can claim it. Send it only to them. Keep it until they do: it is not stored
anywhere but this browser." Then: "Send again next month" (a quiet secondary link to `/plan`),
"Your sends" (`/sent`).

### `/r/<id>#<secret>` — Claim

**Loading.** The envelope's skeleton with ruled bars; "Opening your envelope".

**Open (the main state).** The waiting envelope, dashed: "G5X2…K7PQ sent you" · **$100.00** ·
"$90.00 to spend · 8.7709 USDY, US Treasuries (Ondo) — yours when you claim" · in local
money under each. Then one primary button **"Claim with Face ID"** and one quiet link "I
already have a Stellar wallet". Under the button: "Your face or fingerprint makes a wallet
that only you control. No app, no password, nothing to pay. Sown's servers pay the network."
Then the issuer line for the keep asset, and "If nobody claims it, it goes back to the sender
on 7 Nov 2026. The sender can take it back before then."

**Claiming.** The button reads "Making your wallet…" (Face ID #1) → "Claiming…" (Face ID #2)
→ the envelope prints as a receipt: "Claimed on Stellar · just now · in your wallet". Then
"Open your wallet" → `/mine`.

**Already claimed.** The receipt as it is, with "Claimed 4 Oct, 19:02" and, if this browser
owns the wallet, "Open your wallet"; otherwise "This envelope was claimed."

**Returned.** "The sender took this back on 3 Oct." / "This went back to the sender on 7 Nov,
unclaimed." One link: "Ask them to send again."

**Wrong or missing secret.** "This link is incomplete. Ask the sender to share it again from
their sends page." Never a hash on the screen.

**No Face ID in this browser.** "This browser cannot make a wallet with your face. Open the
link in Safari or Chrome." with "Copy the link". The secret stays in the fragment.

**Has a Stellar wallet.** The wallet sheet (Freighter, xBull, LOBSTR, Hana; deep links on a
phone). Then "Approve twice: once to let Sown's servers prepare your wallet for these assets,
once to claim." One step if the trustlines exist.

**Failed.** The reason in one sentence, "Nothing moved. Your envelope is still waiting.", one
button "Try again".

### `/receipt/<id>` — the public receipt

Unshelled, print-like. The envelope as the hero with rows: *Sent* $100.00 USDC by G5X2…K7PQ ·
*Kept* 10% → 8.7709 USDY · *Price* $1.1401 per USDY on Aquarius, pool fee 0.1% · *At the least*
8.6832 · *To spend* $90.00 · *Claimed* 4 Oct 2026 19:02 UTC by C7KD…M2QA, a wallet made with
Face ID · *Still held* "measured on 3 Nov 2026" (muted) or "8.7709 USDY on 3 Nov · 100%" (green)
· *Send* `a91f…` · *Claim* `0c4e…` (links to stellar.expert). Below: two sheets, "What was
kept" (issuer, flags read from the chain, the raw units at 7 decimals) and "Where it is
anchored" (contract id, envelope id, ledgers). The foot: "This page is built from the Sown
contract's own record on the Stellar ledger, not from our database. Every figure is a value
anyone can read back."

Open state (not yet claimed): the dashed envelope, "Waiting for the recipient", no claim link
(the secret is not here), "Returns by itself on 7 Nov".

### `/sent` — the sender's envelopes

Connected through the Wallets Kit. A stack of rows: state chip (waiting / claimed / returned),
amount, keep, date, and for waiting ones "Share the link again" (from this browser's storage)
and "Take it back". Empty: "Nothing sent from this wallet yet. Send something on the front
page." If the link is not in this browser: "The link was made in another browser. Take this
back and send again."

### `/mine` — the recipient's wallet

Signed out: a door, never an empty page: "Your wallet lives behind your face. Continue with
Face ID" (`connectWallet({ prompt: true })`), and "Claimed on another phone? Your wallet is
found by your passkey." Signed in: *What you hold*: $90.00 USDC (₨25,155) · 8.7709 USDY ≈
$10.00 (US Treasuries, Ondo) — "worth at Aquarius's price right now" — each row with the
issuer line. *Your envelopes*: each claim as a row linking its receipt. *Move to a wallet*:
paste a Stellar address, choose USDC or the keep asset, "Move" — if the address has no
trustline: "That wallet cannot hold USDY yet. Open it and add USDY (Ondo) first." *Cash out*:
"Sown does not move cash. These wallets connect to MoneyGram and local banks on Stellar:
Vesseo, LOBSTR, Decaf, and the anchor directory." Address shown short with copy. No seed
phrase anywhere; "This wallet is yours: it opens with your face on this phone. To use it on
another phone, add it there with the same passkey."

### `/assets` — what can be kept

Three rows. Each: the name people use, the ticker and issuer small, the issuer's own one-line
description quoted, the flags read from Horizon rendered as chips ("issuer can freeze",
"issuer can take back", "no permission needed to hold"), the Aquarius pool and its reserves
read now, "Not for US persons". No price chart, no yield. A closing line: "When DTC-tokenized
stocks and ETFs reach Stellar (expected first half of 2027), a stock becomes a row here."

### `/proof` — ink

The one dark surface. "The proof, read from the chain." The contract id and its sha256
(dumped back and compared, with the command), the admin address and the sentence "it can add
an asset and nothing else", the sponsor's balance and the total it has ever paid, counts
(sent, claimed, returned, outside the team), the three pools with reserves now, the latest
envelopes as rows, the still-held figures when they exist, "unaudited" in the same size as the
counts, links to `/docs/why-not-claimable-balances` and the repo.

### `/plan` — every month

"Send again every month." The last send's fields prefilled; "Remind me on the 1st" writes an
`.ics` file and stores the plan in this browser. The honest line: "Stellar has no standing
orders yet. Sown reminds you; the send is one tap. The rule on your own wallet is next." Empty:
"Make a send first; the plan copies it."

### `/docs/*`

Reading surface, 720 px measure: *How a send works*, *The envelope*, *Why not claimable
balances*, *What the issuer can do*, *Fees, and who pays them*, *The limits*. Facts stated, no
entrance motion.

### Errors, empty, offline

`error.tsx`: what happened, one action. `not-found.tsx`: four places to go. Loading: skeleton
rows that reserve height, never a spinner, never a bar that reads as a figure. Offline:
`/mine` renders the last answer this browser received with its time.

## Holding the line

- every colour is a token or an alias; units and hashes are mono and tabular
- the keep units are the largest thing on any page they appear on
- targets at least 44 × 44 px; phone gutter 16 px; nothing jumps as it loads
- keyboard focus visible in the accent; AA contrast; reduced motion collapses the print
- every button says what happens, and the toast uses the same word
- no number on a surface the chain or a simulation did not give: a quote is the pool's
  estimate; a balance is `balance()`; a price is the fill
