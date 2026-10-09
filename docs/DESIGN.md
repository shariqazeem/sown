# Design

> Sown's own design system, written 9 Oct 2026 when the founder asked for a product that looks
> like its own: premium, modern, warm, and usable by someone who has never held a wallet. It
> replaces the first build's copy of Scrip's paper-and-ledger system (8 Oct). The honesty rules
> and the words did not change; the look did. `src/styles/tokens.css` is the only place a value
> is defined; `src/lib/words.test.ts` holds the words.

## The identity

**The subject is a seed.** Money is sent home; a part of it is planted and left to stand.

| | |
| --- | --- |
| Ground | warm sand `--bg #f6f2ea`; white cards `--surface`; an inset area `--surface-soft` |
| Ink and brand | evergreen: text `--ink #10261c`, the brand `--brand #0f3f2f` (the hero, primary buttons, the wordmark) |
| Alive, on dark ground | the leaf `--leaf #35c47f` (the mark's kept leaf, dots, links on evergreen); on light ground `--leaf-deep #167a4b` (links, selected, AA on white) |
| The part that stays | gold `--gold #e0a63a`, its text `--gold-ink`, its wash `--gold-soft` |
| Money outcomes only | `--ok` (arrived, settled, still held), `--err` (failed, refused), `--warn` (waiting) |
| Type | **Instrument Serif** for headlines, the wordmark, a note and a statement line (`--font-display`); **Manrope** for every word and figure, tabular numerals (`--font-sans`); **DM Mono** for addresses and hashes (`--font-mono`) |
| Shape | radii 10 / 16 / 24 / 32; pills for chips and the primary button; soft green-tinted shadows |
| Motion | `--dur-1..4`, two easings; reduced motion collapses all of it |

Green is money that moves or arrived. Gold is ownership. The two never decorate anything.

**The one picture of the product is the split**: a bar, most of it green (to spend), the rest
gold (stays theirs). It is drawn live on the send card from the pool's own quote, once more as
the "what happens to $100" scene on the front door, as the gold seam on every envelope card,
and on every share image.

## The words

Unchanged from the first build; `src/lib/words.test.ts` reads every surface, the README and
the evidence `/proof` prints.

| Say | Never |
| --- | --- |
| send, sent | transfer, remit, transaction (except on `/proof`) |
| keep, kept, "stays theirs", "10% kept as US Treasuries" | save, invest, allocate |
| US Treasuries (Ondo USDY) · US Treasury notes (Etherfuse USTRY) · Mexican CETES (Etherfuse) | token, RWA, yield-bearing, APY, yield |
| the envelope; "waiting for you" | escrow, contract, claimable balance |
| claim; "Claim with Face ID"; "Claim with a Stellar wallet" | withdraw, redeem, sign |
| your wallet; "a wallet from a face"; OpenZeppelin's account contracts | smart account, passkey, WebAuthn (docs only) |
| Sown's servers pay the network | relayer, sponsor, fee bump, gas |
| take it back (sender) · returned by itself (after the date) | refund, cancel, expire |
| still held, measured | keep-rate (code only) |
| the price on Aquarius right now; "if the price moves more than 1% first, nothing happens" | oracle, slippage |
| in your money (PKR, NGN, PHP, MXN…) | FX, exchange rate |
| a note "sealed on the ledger" | hash, memo, fingerprint (that word is Face ID's) |

Lines under 80 characters. Sentence case. No emoji; Lucide line icons. Amounts lead; local
money beside them in muted type, with the rate and its date in the title attribute.

## The objects

1. **The send card** (`components/send`): a white card (on the evergreen hero at the front
   door). "Send home"; How much as chips ($25 · $50 · $100 · Other); They keep as gold chips
   (5% · 10% · 20% · Other); **the split**: the bar, then To spend (green dot, dollars, local
   money) and Stays theirs (gold dot, the keep's units largest on the card, the asset's full
   name); Kept as (mainnet only: the three assets); "Add your name and a note"; one pill button
   "Send $100"; the line under it; on testnet, "Try it with a test wallet that funds itself".
2. **The confirm sheet**: a native `<dialog>`, a bottom sheet on a phone. From this wallet ·
   They get (the keep in gold) · With your note (serif italic) · At the least · Network fee ·
   Returned by itself · The issuer · the trust line · "Approve $100 in wallet".
3. **The gift** (`app/r/[id]`): the envelope as the recipient sees it. An evergreen head ("Sent
   on Stellar, waiting for you" · Sown); "Shariq sent you" (the note's name if the ledger
   vouches for it, else the address); the whole amount in the reader's own money, largest;
   the dollars under it; the note in serif italic; two parts, To spend (sand) and Stays yours
   (gold wash, the units largest); when it was sent. Then one button, "Claim with Face ID".
4. **The envelope card** (`components/envelope`): the receipt's shape at five sizes: the row,
   the compact card, the receipt hero, the share image, the worked example. A gold seam along
   the top, the kept units largest (a long figure steps down a size and never breaks its
   symbol), ruled rows. It lands once when a real one first appears.
5. **The link sheet** (`app/receipt/[id]/sent-sheet.tsx`): after a send. "Send them this link",
   a QR code for the phone in the room, the link, Share on WhatsApp, Copy, the line that says
   the link is the money.
6. **The split scene** (`components/front/split.tsx`): "$100 sent home", the bar filling once
   when reached, two parts with the pool's figures, labelled arithmetic.

## The note

Optional: the sender's name (40 characters) and a note (140). They ride in the link's fragment
after the secret (`#<secret>.<note>`), never through a server; the send writes their sha256 as
the envelope's memo. The claim page shows them only when the ledger's memo is their hash
(`src/lib/envelope/note.ts`). The public receipt says a note was sealed, never its words.

## Onboarding, counted

**Sender** (has a Stellar wallet): tap an amount · tap a keep · (a name and a note, if they
like) · "Send $100" → the confirm sheet → "Approve in wallet" → **one** prompt → the receipt
with the link and the QR. On testnet, "Try it with a test wallet" does the same with a wallet
that funds itself in this browser.

**Recipient** (has nothing): tap the link · "Claim with Face ID" → **one** Face ID (the wallet is
made; Sown's servers deploy it and submit the claim the link signed) → the gift says "Stays
yours · in your wallet" → "Open your wallet". Zero typing, zero downloads. In a chat app's
browser: "Open this link in Safari or Chrome", with the link intact.

**Recipient** (has a Stellar wallet): "I already have a Stellar wallet" → choose it → one
approval the first time (Sown's servers prepare it to hold the assets) → the claim goes through
by itself.

## Screens

| Screen | Pattern |
| --- | --- |
| `/` | The evergreen hero: eyebrow (live on Stellar / testnet), the headline in serif with the second sentence in gold italic, the lede, three checks, the positioning line; the send card beside it (under it on a phone). Then on sand: what happens to $100 (the split scene), how it works (three cards with drawings), what they keep (asset cards and "Stocks and ETFs held at DTC, expected 2027" as a dashed next row), one real envelope or the worked example, why this only works on Stellar (six cards), before you send, the contract line |
| `/r/[id]` | The gift, then the one action. One centred column, 520 px |
| `/receipt/[id]` | The envelope card as the hero (sticky on a wide screen) beside the link sheet (after a send) and two sections: what was kept (asset, issuer, flags read from the ledger, raw units) and where it is anchored (contract, envelope, the note's seal, ledgers, network) |
| `/sent`, `/mine`, `/plan`, `/assets`, `/docs/*` | Sand, the serif page title, cards and rows from `site.css` |
| `/proof` | Evergreen (`.sw-ink`): counts as cards, the contract, who can do what, the pools, still held, every envelope, the evidence |
| errors, empty, loading | `error.tsx` says what happened and offers one action; `not-found.tsx` offers four places; skeletons are the real layout with bars, never a spinner, never a figure |

## Holding the line

- every colour is a token or an alias; no raw hex outside `tokens.css` (the share images read
  `src/lib/og/palette.ts`, held to `tokens.css` by a test)
- the keep's units are the largest figure on any card they appear on
- targets at least 44 × 44 px; a phone gutter of 16 px; nothing jumps as it loads
- keyboard focus visible in the leaf; AA contrast (`--leaf-deep` on white is 5.3:1)
- one primary button per screen, a trust line above every signature
- no number on a surface the chain or a simulation did not give: a quote is the pool's
  estimate; a balance is `balance()`; a price is the fill; a worked example is labelled
