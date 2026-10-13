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

## The pitch video: three minutes, you on camera, the product live, step by step

**Three devices, one take.** The MacBook records its screen and your face with its own camera
(Loom, or Zoom "record to this computer" with the camera on, or OBS). The iPhone is the recipient,
plugged in by cable and mirrored into QuickTime (File › New Movie Recording › the arrow by the
record button › your iPhone), its window beside the browser. A second phone shows this script,
scrolling slowly, held under the camera. Before you start: Freighter unlocked with USDC on
Stellar; `sown.world` in the browser, no bookmarks bar; `sown.world/proof` in a second tab.
Every line below is said while you do that step. The waits are real; keep talking through them.
Say numbers as they appear on screen that day. If a step fails, stop, fix, start again.

| Step | You do | You say |
| --- | --- | --- |
| 0 · 0:00 | Look at the camera. The home page behind you. | "Hi, I'm Shariq. This is Sown, live on Stellar mainnet. Every year, seven hundred billion dollars is sent home to families, and it is spent the week it arrives. Sown makes part of every send stay. Let me show you, with real money, start to finish." |
| 1 · 0:15 | Tap **Other**, type **10**. Tap **10%**. Point at the split. | "I'm sending ten dollars home, and I choose how much stays: ten percent. The card asks the real Aquarius pool, right now, what that slice buys: about ninety cents of USDY, Ondo's US Treasuries, already issued on Stellar. Nine dollars to spend. Ninety cents that stays." |
| 2 · 0:35 | Tap **Add your name and a note**. Type your name, then "For school fees, with love". | "I add my name and a note. The note travels inside the link, never through our servers, and the send seals its hash on the ledger." |
| 3 · 0:50 | Tap **Send $10**. Point down the confirm sheet as you speak. | "Before my wallet opens, Sown says exactly what happens. What leaves my wallet. What they get. The least it can become if the price moves. And what the issuer can do: Ondo can freeze this or take it back, and it says so here, read from Ondo's account on the chain, not from a brochure." |
| 4 · 1:10 | Tap **Approve $10 in wallet**. Approve in Freighter. Wait for the receipt. | "One approval. That single signature does the send and the keep in one Soroban transaction: the contract takes my ten dollars, buys the slice on Aquarius, and writes the envelope into the ledger." *(the receipt prints)* "The receipt. And the link: the link is the money. There is a QR for the phone in the room." |
| 5 · 1:30 | Pick up the iPhone. Open the camera, point it at the QR, tap the banner. The gift page opens in Safari. | "Now I'm the person at home. No wallet, no app, nothing. I scan the code." *(the page opens)* "It says who sent it and why, in my own money. Nine dollars to spend, and the part that stays. One button." |
| 6 · 1:45 | Tap **Claim with Face ID**. The passkey sheet, Face ID. The three steps tick. | "Claim with Face ID. My face makes a wallet that only I control, an OpenZeppelin account deployed on the spot, and Sown's servers pay the network." *(the steps tick)* "The wallet is made. The claim goes through. And it is mine: dollars I can cash out through any MoneyGram-connected Stellar wallet, and Treasuries that stay." |
| 7 · 2:10 | Tap **Open your wallet**. Show the total. Scroll to **Keep Sown on your phone**. | "This is the wallet: what I hold, in my own money. And it stays on my phone, behind my face: Share, Add to Home Screen, and Sown is an app." |
| 8 · 2:25 | On the Mac, reload the receipt tab, then open the **proof** tab. | "Every figure on this receipt is read from the ledger, not from our database: what was sent, what was kept, the floor, who claimed it. In thirty days anyone can ask the contract whether it is still held. The proof page shows the contract's code hash matching the open-source repo." |
| 9 · 2:40 | Back to the camera. | "Only Stellar makes this possible: government debt with real liquidity on Aquarius, wallets made from a face, fees paid for the recipient, MoneyGram cash on the other end. And when DTCC brings stocks to Stellar next year, a send can keep stock. Sown. Send money home. Part of it stays theirs. sown dot world." |

About 400 spoken words: 2:45 at a natural pace. If you run long, drop the DTCC sentence first,
then "not from a brochure". With a $5 send say "five", "forty cents", "four dollars fifty".

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

## Submission text (demo.stellarpassport.xyz, the General Track form)

The form has: Challenge · Project name · Describe your project · Submission Track · email · repo ·
video pitch (3 minutes max) · other links · terms. Paste as-is.

**Challenge / Submission Track**

```
General Track
```

**Project name**

```
Sown — send money home, part of it stays theirs
```

**Describe your project** (under 1,500 characters)

```
Sown turns part of every remittance into ownership. A sender sends USDC on Stellar and chooses a keep (10% by default). In the same Soroban transaction the slice is swapped on Aquarius into US Treasuries (Ondo USDY), US Treasury notes (Etherfuse USTRY) or Mexican CETES and placed, with the cash, in an envelope held by the Sown contract. The sender can add a name and a note; they travel inside the link and the send seals their hash on the ledger. The recipient taps the link (or scans a QR): "Shariq sent you ₨27,950 · for school fees", what is theirs to spend and what stays theirs, one button. Their face makes a wallet (an OpenZeppelin account via Stellar's Smart Account Kit); Sown's servers pay the network; the envelope hands over dollars to spend and Treasuries that stay, in a wallet only they control, kept on their phone. Every send and claim is a receipt read from the ledger, and 30 days after a claim anyone can measure whether the keep is still held. Live on mainnet at sown.world: contract CDQUJPAEWFFPS6ZBVF7SIRIVSKZDVMDZB4NFD3IAFS6D67N2JHMUHRFE; a real envelope at sown.world/receipt/0 ($1 keeping 10% as USDY, claimed into a wallet made with one passkey). Stellar made it: real government debt with ~$2M of Aquarius depth per asset, passkey accounts, fee sponsorship, invoker-contract auth for the pool call, persistent storage for the receipt, and MoneyGram-connected wallets to cash out. Unaudited; not for US persons; issuer powers shown on every row from on-chain flags.
```

**Link to your repo**

```
https://github.com/shariqazeem/sown
```

**Link to your video pitch**: the unlisted YouTube link of the three-minute recording.

**Any other relevant links** (one per line)

```
Live on mainnet: https://sown.world
Try it as the recipient (a real $1 envelope; the first to tap it with Face ID keeps it): <claim link 1>
A second one, in case the first is taken: <claim link 2>
A real receipt, read from the ledger: https://sown.world/receipt/<the filmed envelope>
The contract on stellar.expert: https://stellar.expert/explorer/public/contract/CDQUJPAEWFFPS6ZBVF7SIRIVSKZDVMDZB4NFD3IAFS6D67N2JHMUHRFE
The proof page (code hash, admin, what Sown's servers hold): https://sown.world/proof
The silent product film (110 s): <the film's link, if uploaded>
```

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
