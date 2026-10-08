# The decision: Sown

> Written 2026-10-08, four days before the Find Your Way deadline. Sources for every fact are
> in `RESEARCH.md`. This file records *why* — reopening a choice here needs a new fact, not a
> new opinion.

## One sentence

**Sown turns part of every remittance into US Treasuries the recipient owns — in their own
wallet, claimable with Face ID before they even have one — on Stellar, with a receipt.**

## What it is

A person abroad sends USDC home and answers one question: *keep how much?* In one Soroban
transaction the keep slice is swapped on Aquarius into Ondo USDY (US Treasuries), Etherfuse
USTRY (US Treasury notes) or CETES (Mexican T-bills) and placed with the cash in an envelope
the Sown contract holds. The recipient taps a WhatsApp link; Face ID makes them a passkey
smart account (OpenZeppelin's contracts via Stellar's Smart Account Kit); Sown's servers pay
the fees; the envelope hands over dollars to spend and Treasuries that stay. Every send and
every claim is a receipt read from the ledger. Thirty days later anyone can measure whether the
keep is still held, and the receipt says so.

It reuses Scrip's design language (paper, ink, the stub, one accent, honesty per row) and
Scrip's product grammar (one question, one signature, a receipt, a public proof page) while
standing on its own: the mechanism only exists because of what Stellar has — real tokenized
government debt with AMM depth, passkey accounts as first-class citizens, fee sponsorship, and
a cash network (MoneyGram-connected wallets, anchors) on the other end.

## Why it wins, against the six criteria

| Criterion | The case |
| --- | --- |
| Technical execution | A Soroban contract that calls an AMM pool cross-contract with its own authorisation, writes a persistent receipt in the same transaction, and holds a state machine with tests; passkey smart accounts deployed and claimed through a relay that inspects before it signs; a mainnet flow with real USDC and real USDY, timed and recorded |
| Meaningful use of Stellar | Nothing in it is a port. Aquarius liquidity in tokenized Treasuries, SACs, passkey accounts, fee sponsorship, invoker-contract auth, persistent storage, issuer flags read for disclosure, and the cash side that only Stellar has (MoneyGram-connected wallets). The docs say plainly why claimable balances — the "obvious" Stellar primitive — are not used: a smart account cannot claim one |
| Originality | The sender-side keep is not on any Stellar project found (`RESEARCH.md` §Competitors): RemitStream splits on the recipient's side into a vault with no yield source on testnet; Vesseo/Beans/Decaf are wallets; CircleUp is a ROSCA. Nobody delivers a real RWA into a wallet that did not exist a minute earlier |
| Potential impact | $728.6B went to low- and middle-income countries in 2025 (IFAD). A 10% keep on a slice of that is the largest retail "first investment" channel there is, and it rides existing behaviour: nobody has to decide to invest, only to keep |
| User experience | The sender answers one question and signs once. The recipient taps and sees their face. Amounts in the viewer's own money. Every state designed, nothing simulated |
| Presentation | The film writes itself: a laptop sends, a phone receives, a receipt prints, the explorer shows the swap inside the send. The close is one true line: the same rail carries stock when DTCC lands on Stellar in 2027 |

## Does "tokenized stocks" fit Stellar? The honest answer

Not yet, and the plan says so. On 2026-10-08 no tokenized public equity trades on Stellar with
any liquidity I could find; Stellar's ~$4B of tokenized RWAs is Treasuries, money-market funds,
private credit and non-US sovereign debt. DTCC chose Stellar as the public chain for its
tokenization service — Russell 1000 constituents, major index ETFs and US Treasuries — for the
first half of 2027, under DTC's investor protections. So the product that fits Stellar *today*
is **ownership of government debt**, which already has ~$2M of Aquarius depth per asset and is
the thing a family in a high-inflation country actually wants first. Sown is built as a rail
with a catalogue: a keep asset is a (token contract, pool, indices) record. When a DTC asset
exists on Stellar, it is one `set_asset` away — plus the "registered envelope" work for
auth-required assets described in the roadmap. Saying this on stage is stronger than faking a
stock.

## Every candidate, scored

Scores 1–5. The six judging criteria, then three more: *only or best on Stellar*, *fits the
tokenized-stocks trend honestly*, *one builder + Claude can make it polished by 12 Oct*.

| # | Candidate | Tech | Stellar use | Original | Impact | UX | Present | Only-on-Stellar | Stocks fit | Feasible | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **S** | **Sown** (the sender keeps; envelope; passkey claim; receipt) | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 4 | 4 | **42** |
| 1 | Send home ownership (as sketched: claimable balances + optional monthly rule) | 4 | 5 | 3 | 5 | 4 | 5 | 5 | 4 | 4 | 39 |
| 6 | Vested — gifts of ownership that unlock on a date (claimable-balance predicates) | 3 | 5 | 4 | 3 | 4 | 3 | 5 | 4 | 5 | 36 |
| 5 | Kin — a family's shared smart account with spending-limit policies and an auto-keep | 5 | 5 | 4 | 4 | 4 | 4 | 4 | 3 | 2 | 35 |
| 3 | Scrip on Stellar — a slice of every incoming payment becomes an asset, by policy | 4 | 3 | 2 | 4 | 4 | 4 | 2 | 4 | 3 | 30 |
| 7 | The counter — cash at MoneyGram becomes Treasuries (anchor-first) | 2 | 5 | 3 | 5 | 3 | 2 | 5 | 3 | 2 | 30 |
| 4 | The registered wallet — compliant self-custody for DTCC-era securities | 3 | 4 | 3 | 3 | 2 | 2 | 5 | 5 | 2 | 29 |
| 8 | Ownership payroll — teams pay in Treasuries or stock with receipts | 4 | 3 | 2 | 3 | 3 | 3 | 2 | 4 | 4 | 28 |
| 2 | Invest together — on-chain clubs in the spirit of stokvels and chamas | 4 | 3 | 2 | 4 | 3 | 3 | 2 | 3 | 3 | 27 |

### Why each lost

**1. Send home ownership, as sketched.** It is the right family; Sown is its sharpened form.
What changed and why: (a) *the claimable balance cannot be the waiting room* — `ClaimClaimableBalance` must be submitted by a classic claimant account, and the person we most need
to reach has no account; a passkey smart account is a contract and cannot claim one. The
envelope contract is the smart-account-era equivalent, and it also gives us the receipt as a
ledger entry and the still-held measurement. (b) *the keep is swapped inside the same
transaction on Aquarius* rather than by a classic path payment, so the sender signs once even
when the recipient is a contract address (classic payments cannot target a C-address). (c) *the
monthly rule is a plan, not a promise* — Stellar has no standing orders; saying "every month"
without a mechanism would break the honesty rule, so v1 reminds and v2 puts the rule on the
sender's smart account as a policy. (d) MGUSD cannot be the cash leg: its issuer has 422
trustlines of which 22 are authorised, i.e. it is permissioned to MoneyGram's own wallets. USDC
is the asset those wallets cash out.

**6. Vested.** The purest use of a Stellar-only primitive (a claimable balance with
`not(before_absolute_time(t))` for the child and `before_absolute_time(t)` for the parent is a
native vesting schedule, no contract). It lost on impact (a gift product is a niche), on the
demo (an unlock in the future cannot be shown live without a two-minute predicate that reads as
a trick), and on the same claimant problem: a child with no wallet cannot claim. It survives as
a Sown feature: a send whose envelope opens on a date is one `claim_after` field away. Roadmap.

**5. Kin, the family account.** The most "Stellar 2026" idea: OpenZeppelin smart accounts with
context rules and spending-limit policies, Protocol 27 auth delegation, several passkeys on
one account. It lost on feasibility: a wallet product with policies on a 0.8.0 kit, by one
person, in four days, is a bet on the kit's edges; and its emotional moment (a limit rejecting
a spend) is weaker than Sown's (a person owning something). It is Sown's v2 for the sender
side: the monthly keep as a policy the account itself enforces.

**3. Scrip on Stellar.** It is the founder's own product ported; judges would not know, but the
founder would, and the brief asks for a product that stands on its own. Technically it needs a
trigger on arrival (an allowance pulled by a service, i.e. a keeper by another name, or a
smart-account policy), and RemitStream already built the recipient-side split on testnet.
What survives: the receipt, the still-held number, the proof page, the honesty rules — Sown
carries all of them.

**7. The counter.** "Walk into MoneyGram with cash, walk out owning Treasuries" is the biggest
story on Stellar and cannot be demonstrated honestly in four days: MoneyGram Ramps requires an
allowlisted domain, certification and signed agreements; the production preview is capped at
10–20 USDC per transaction and still needs onboarding. SDF's test anchor would make the demo a
webview on testnet. Sown links to the wallets that already do this and leaves the integration
for after the hackathon.

**4. The registered wallet.** Right thesis, wrong year. There is no regulated equity on Stellar
to hold today; a demo would be a shell around a test asset with SEP-8 approvals, and "a wallet"
is the most crowded category on Stellar. Its real content — auth-required assets, issuer
authorisation of a contract's balance, clawback disclosure — becomes Sown's "registered
envelope" roadmap item, which is what will make DTC assets keepable.

**8. Ownership payroll.** PayZoll won Build Better 2025 with payroll; Scrip's organisation side
already does pay-in-stock on Solana. Less original, less Stellar-specific, and the user (a
company) is harder to film than a mother receiving money.

**2. Invest together.** Rotating and pooled savings clubs are real and global, but on Stellar
CircleUp (a Soroban ROSCA with factory, circle and reputation contracts) exists with more than
twenty forks, and ROSCA dapps exist on every chain. A pooled "club" needs several people to
act for anything to happen, which is the hardest demo to make true in four days. The social
mechanism (a group keeping together) is a Sown v3 idea: a family envelope with several
claimants and exact shares.

## Originality check, what was searched (2026-10-08)

Searched: Stellar remittance + savings/treasuries/USDY; Stellar passkey remittance; Stellar
claimable balance remittance; ROSCA/chama/stokvel/tanda on Stellar/Soroban; Stellar auto-save
/ round-up; Stellar investment club; HackMeridian 2025 winners; Stellar Community Fund
remittance projects; Stellar Passport submissions (not readable; the event page shows no
project list).

Nearest neighbours, with links:

- **RemitStream** — recipient sets a savings rule; an `AutoSplitRouter` sends the rest to a
  `SavingsVault`; testnet; test token with a faucet; no yield source; path payments and
  claimable balances listed as roadmap only. https://github.com/Anuoluwapo25/remitStream
- **SendIN** (Stellar Community Fund plan) — passkey logins and non-custodial wallets for a
  US→India corridor; a 2025-era plan, no ownership component. https://communityfund.stellar.org/project/recyBlX10TRElhbGN
- **SwiftSend** (HackQuest) — onboarding with a wallet created in seconds; testnet token
  issuance and simulated transfers. https://hackquest.io/en/projects/Code-Africa-Hackathon-20-SwiftSend
- **CircleUp** — ROSCA on Soroban (factory, circle, reputation); upstream
  `CIRCLEUP-AJO/CIRCLEUP`, 20+ forks. https://github.com/arcphlamez/CIRCLEUP
- **Vesseo (ex-Vibrant)** — SDF-built self-custodial USDC wallet with yield, MoneyGram cash-in,
  Argentina-led. https://stellar.org/case-studies/vibrant
- **Beans** — non-custodial payments and savings; fee bumps and sponsored reserves; MoneyGram.
  https://communityfund.stellar.org/project/beans-app
- **Decaf** — Stellar + Solana wallet with WhatsApp payment links and MoneyGram cash-out in
  180+ countries. https://stellar.org/case-studies/decaf
- **MoneyGram app with MGUSD** — self-custodial dollar wallet in the MoneyGram app, launched 2
  June 2026, US first. https://www.theblock.co/post/403320/moneygram-debuts-mgusd-stablecoin-on-stellar-for-its-global-payments-network
- **Veil** — open-source passkey smart wallet on Soroban. https://github.com/viccoder-oops/veil
- **Stellar Passport** — SDF's own passkey-first onboarding; the judges' platform.
  https://stellarpassport.xyz
- **Scrip** (the founder, Solana) — save part of every payment into tokenized stocks, receipts,
  still-held at 7 and 30 days. https://scrip.work
- **Umbra** (the founder, Stellar) — ZK privacy pool on mainnet; 3rd, Stellar Hacks: Real-World
  ZK. The lesson applied here: a judge scores what runs in two minutes and what the explorer
  confirms, never the primitive. https://getumbra.xyz

No project found pairs a sender-side keep, a real RWA bought inside the send, a passkey claim
for a recipient who has nothing, and a ledger-anchored receipt.

## What recent winners say about what wins here

HackMeridian 2025 (Rio): Innovation — The Simple Fund, 4Bridge, Stellar Forge; Composability —
Lance, Star Lends, Panorama Block. Build Better 2025 and the i³ awards rewarded payroll,
cash-to-DeFi and financial access. The founder reports Pacta (an escrow that releases a
patient's payment at the clinic) winning Istanbul 2026 and a PIX on/off-ramp kit winning São
Paulo 2026 (not independently verified). The pattern: a real-world money moment, made true on
chain, shown moving, with a human on each end. Sown is built to that pattern.

## The founder must decide

1. **The name.** `Sown` ("s-own": money sent home, sown not spent) is the working name and the
   folder. Alternatives if a domain is unavailable: *Keeps*, *Portion*. Check the domain today.
2. **Mainnet budget.** About 60 XLM for the sponsor account and contract deploy, and about $20
   of USDC for sends. `BUILD-PLAN.md` §Budget.
3. **Which keep assets ship.** USDY alone is enough for the submission; USTRY and CETES are one
   `set_asset` each and a catalogue row. Recommended: all three, because CETES makes the
   Mexico corridor real and shows the catalogue is a catalogue.
4. **Who claims in the film.** A real second person on a real phone (a friend, a family member)
   beats the founder claiming from his own phone. Ask today.
