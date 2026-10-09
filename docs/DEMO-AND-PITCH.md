# Demo, pitch, submission, launch

> The founder does not narrate (he records silent screen captures; the agent edits and
> captions). Every figure in the film and the posts is read live from the product and is
> checkable on stellar.expert. Nothing staged, nothing simulated on mainnet. If a scene cannot
> be real by Saturday morning, it is cut, never faked.

## The film — about 1:50, silent with captions, 1080p, in Sown's own design

Draft 2 (9 Oct, `../sown-video/motion/boards/pitch.mjs`) is built from recordings of the live
testnet site in the new design: evergreen type scenes, the card and the claim page in a phone
frame, the receipt in a window, the assets and proof pages in a browser frame, the split bar,
the close. Every figure on screen is re-read from the live page when the board is built.

| # | Time | Scene | Caption (sentence case, ≤ 2 lines) |
| --- | --- | --- | --- |
| 0 | 0:00–0:07 | Evergreen. One line. | "Money sent home is spent the week it arrives." |
| 1 | 0:07–0:13 | Evergreen. | "$728.6 billion went home last year. Almost none of it stayed." (IFAD, 2026) |
| 2 | 0:13–0:31 | Phone: the send card, $50, 20%, 10%, the split bar moving. Callouts. **Slot R1.** | "Send dollars home in USDC on Stellar" · "Keep 10% as US Treasuries" · "One signature" · "The rest arrives as dollars to spend" |
| 3 | 0:31–0:45 | Phone: the claim page of a waiting envelope with a note: "Shariq sent you ₨1,385 · For Ammi. School fees, with love". Callouts. **Slot P1** (the founder's phone take with the Face ID prompt replaces this). | "A link in WhatsApp, or a QR" · "Who sent it, and why: the note is sealed on the ledger" · "One Face ID makes her a wallet" · "Sown's servers pay the network" |
| 4 | 0:45–1:03 | The receipt of envelope 6 (claimed by a wallet made with Face ID). Callouts. | "What was sent and what was kept" · "The least it could become, before anyone signed" · "Claimed by a wallet made with Face ID" · "Still held? Measured on chain at 30 days" |
| 5 | 1:03–1:15 | `/assets` scrolled slowly. | "Read from each issuer's account on the chain. No return is promised." |
| 6 | 1:15–1:27 | `/proof` scrolled slowly. | "The contract's hash, what Sown's servers hold and pay, every envelope. Unaudited, and it says so." |
| 7 | 1:27–1:39 | Evergreen. The split bar fills, green then gold. | "Today: US Treasuries and Mexican CETES, live on Stellar." / "Planned for 2027: stocks and ETFs held at DTC, on Stellar." / "Same send. Same receipt." |
| 8 | 1:39–1:50 | The close: the sprout, the wordmark, the line, the address. | "Send money home. Part of it stays theirs." · "Built on Stellar for Find Your Way, October 2026. Unaudited. Not for US persons." |

Recording list for the founder (silent, one take each; on mainnet, on the final domain):
R1 laptop, 1440 × 900, no bookmarks bar: `/` → $50 → keep 10% → add a name and a note →
"Send $50" → the confirm sheet → Freighter approve → the receipt with the QR → "Share on WhatsApp".
P1 the recipient's phone, screen recording on: WhatsApp → the link → the claim page ("… sent
you", the note) → "Claim with Face ID" → the one Face ID prompt → "Stays yours · in your
wallet" → "Open your wallet" → `/mine`.
R2 stellar.expert: the send transaction (the Sown contract, the Aquarius pool, USDC in, USDY
out), then the claim into a C-address.

## The pitch, as a judge hears it (90 seconds, for the form and for a stage)

Every year $728 billion is sent home to families in low- and middle-income countries. It
arrives as cash and is spent within days — rent, food, school fees. Nothing stays. The people
sending it would keep some of it as an asset if that were one question instead of a second
life as an investor.

Sown is that question. The sender sends USDC on Stellar as they would anyway and chooses a
keep — ten percent by default. In the same transaction the slice is swapped on Aquarius into
US Treasuries, Ondo's USDY, or Mexican CETES, and placed with the cash in an envelope that a
Soroban contract holds. The recipient taps a link; their face makes a wallet (an OpenZeppelin
smart account through Stellar's Smart Account Kit); Sown's servers pay the network; the
envelope hands over dollars to spend and Treasuries that stay — in a wallet only they control.
Every send and every claim is a receipt anyone can open, read from the ledger, and thirty days
later anyone can measure whether the keep is still held.

It only works on Stellar: real tokenized government debt with millions of dollars of AMM depth,
passkey accounts as first-class citizens, fee sponsorship, and the cash network on the other
end — MoneyGram-connected wallets in 170-plus countries. And Stellar is the chain DTCC chose
for tokenized Russell 1000 stocks, ETFs and Treasuries in 2027. When those land, a send can
keep stock. Same send, same receipt.

It is live on mainnet. Here is a real envelope, sent from a laptop, claimed on a phone by
someone who had no wallet a minute earlier.

## Judge questions, with the short true answers

- *Why not a claimable balance?* It is the Stellar way to pay someone who does not exist yet —
  but only a classic account can claim one, and a passkey wallet is a contract. The envelope is
  the smart-account-era claimable balance; the roadmap adds the native path for people who
  already have a wallet.
- *Who holds the money?* The Sown contract, between send and claim. It has no function that
  lets Sown move an envelope; the admin can only add an asset. The code is in the repo; the
  sha256 on `/proof` matches the chain.
- *What if Ondo freezes USDY?* Then the receipt will show it. The row says Ondo can freeze and
  claw back, read from the issuer's flags, before anyone sends.
- *Isn't this a remittance app?* It moves no fiat. It is the keep, the envelope and the
  receipt, on top of money people already send.
- *How do you make money?* Not yet. The honest option is an Aquarius provider fee on the keep
  conversion, in basis points, printed on every receipt.
- *Why Treasuries and not stocks?* Because that is what exists on Stellar today, and it is what
  a family in a 20%-inflation country wants first. Stocks are a catalogue row in 2027.
- *Is it audited?* No. The kit says so, the contract says so, `/proof` says so. Balances are
  small and the founder's.

## Submission text

Fields are not published; these blocks are sized for common limits. Paste as-is; replace the
bracketed values on Saturday.

**Name**

```
Sown
```

**One line (≤ 100 chars)**

```
Send money home. Part of it stays theirs: US Treasuries in their own wallet, claimed with Face ID.
```

**Description (≤ 1,500 chars)**

```
Sown turns part of every remittance into ownership. A sender sends USDC on Stellar and chooses a keep (10% by default). In the same Soroban transaction the slice is swapped on Aquarius into US Treasuries (Ondo USDY), US Treasury notes (Etherfuse USTRY) or Mexican CETES and placed, with the cash, in an envelope held by the Sown contract. The sender can add a name and a note; they travel inside the link and the send seals their hash on the ledger. The recipient taps the link (or scans a QR): "Shariq sent you ₨27,950 · for school fees", what is theirs to spend and what stays theirs, one button. Their face makes a wallet (an OpenZeppelin account via Stellar's Smart Account Kit); Sown's servers pay the network; the envelope hands over dollars to spend and Treasuries that stay, in a wallet only they control. Every send and claim is a receipt read from the ledger, and 30 days after a claim anyone can measure whether the keep is still held. Live on mainnet: contract [C…], a real envelope [receipt link], claimed on a phone by someone with no wallet a minute earlier. Stellar made it: real tokenized government debt with ~$2M of Aquarius depth per asset, passkey accounts, fee sponsorship, invoker-contract auth for the pool call, persistent storage for the receipt, and MoneyGram-connected wallets to cash out. Unaudited; not for US persons; issuer powers shown on every row from on-chain flags.
```

**Stellar features used (≤ 500 chars)**

```
Soroban contract with a cross-contract Aquarius swap authorised via authorize_as_current_contract; Stellar Asset Contracts (USDC, USDY, USTRY, CETES); OpenZeppelin passkey smart accounts through the Smart Account Kit; fee sponsorship (Soroban submission by a funded account, fee bumps and sponsored trustlines for classic wallets); persistent storage with TTL for ledger-anchored receipts; issuer flags read from Horizon for per-asset disclosure; Stellar Wallets Kit for senders.
```

**What is real (≤ 300 chars)**

```
Mainnet: the contract, USDC, USDY/USTRY/CETES, Aquarius, passkey accounts, the receipts, the note sealed on the ledger. Testnet: the battery and the live site (the keep is a labelled stand-in; no RWAs exist on testnet). Nothing simulated on mainnet. Cash-out is linked, not integrated.
```

**Links**: repo · live app · demo video · mainnet contract on stellar.expert · one receipt.

## Launch posts (X, from the founder's account; draft, never post from an agent)

Energy and the words people search for, figures read live, no links in replies. Post after the
submission is confirmed.

**1 — the thread opener (with the 15-second clip: send → phone → Face ID → receipt)**

```
Built Sown for Stellar's Find Your Way hackathon.

Send money home. Part of it stays theirs.

Send $50 in USDC → keep 10% as US Treasuries (Ondo USDY), bought inside the same transaction on Aquarius → she taps a WhatsApp link, Face ID makes her a wallet, the envelope hands it over. No app. No seed phrase. No XLM.

Live on Stellar mainnet. Receipt below.
```

**2 — the receipt (screenshot of `/receipt/<id>`)**

```
This is a real envelope on mainnet.

$[50.00] sent · 10% kept · [4.38] USDY in a wallet made with Face ID.
Price: Aquarius pool, [0.1]% fee. Claimed [12] seconds after the tap.

Every figure is on the ledger. In 30 days anyone can measure if it's still held.
```

**3 — why Stellar (text + the explorer clip)**

```
Why this only works on Stellar:

• tokenized US Treasuries and Mexican CETES already live here, ~$2M of AMM depth each
• passkey smart accounts (OpenZeppelin + Smart Account Kit): a wallet from a face
• fee sponsorship: the recipient pays nothing
• MoneyGram-connected wallets to cash out in 170+ countries
• and DTCC picked Stellar for tokenized stocks, ETFs and Treasuries in 2027

Same send. Same receipt. Stock next.
```

**4 — the honesty post (screenshot of `/assets`)**

```
No yield number anywhere in Sown.

Every asset row says what the issuer can do, read from the chain: freeze, take back, no permission needed to hold. Not for US persons. Unaudited.

If you can't say it on the row, you shouldn't sell it in the hero.
```

**5 — the build (screenshot of the contract tests)**

```
One Soroban contract: send, claim, refund, measure.
The pool call is authorised by the contract itself (authorize_as_current_contract).
The receipt is a persistent ledger entry written in the same transaction.
Rust tests hold the invariants; the relay signs only what it inspected.

Repo in the thread.
```

**6 — the ask**

```
If you send money home: would you keep 10% as Treasuries if it were one tap?
If you build on Stellar: tell me what breaks. Mainnet, small amounts, my own money.
```

**LinkedIn (one post, longer, after the thread)**: the pitch's first three paragraphs, the
receipt screenshot, the mainnet contract id, "built in four days for Stellar's Find Your Way
hackathon ahead of HackMeridian Lisbon", and a closing line about Breakpoint in November.

## Motion ideas that stop a scroll (for the clips, each ≤ 15 s, square and vertical cuts)

1. **The envelope prints.** A real screen recording, cropped to the stub; the perforation tears
   as it rises (the `is-printing` motion), the keep units land last and largest. Loop.
2. **Two phones, one line.** Split screen: the laptop's "Send $50" on the left, the phone's
   Face ID glow on the right; a single thin line travels from one to the other as the
   transaction confirms; the receipt prints on both at once. Timed to the real confirmation.
3. **Spent vs stayed.** A $100 bill made of paper tears along a perforation: $90 drifts up and
   fades ("spent"), $10 settles into the stub and stays. Paper, ink, one accent. Five seconds.
4. **The ledger line.** stellar.expert's transaction page scrolls under a magnifier that pauses
   on three things: the Sown contract, the Aquarius pool, the C-address. Captions name each.
5. **The counter that cannot be faked.** "Still held: measured on 3 Nov 2026" — a date, not a
   number, until the date comes. Then the number. Post it on the day.
6. **Three words, three countries' money.** The same receipt, the amounts flipping through
   PKR, NGN, PHP, MXN as the time zone changes (the product's own local-money feature).

## After the hackathon

Breakpoint (London, 15–17 Nov): one printed envelope receipt per conversation, the still-held
reading from 3–9 Nov in hand, and the Scrip-on-Solana / Sown-on-Stellar pair as the story:
same design, two chains, each doing what only it can.
