# Sown

> Canonical spec. When code and this document disagree, **the code wins** — record real drift
> under "Known drift" at the bottom rather than quietly editing this file.
>
> Written 2026-10-08 for the Stellar "Find Your Way" hackathon (submissions close 12 Oct 2026;
> the exact cutoff time is not published — confirm it on demo.stellarpassport.xyz before
> relying on it). The decision and its alternatives are in `docs/IDEA.md`; every number and
> every Stellar fact used here has a source and a read-date in `docs/RESEARCH.md`.

---

## 0. Start here

Read in this order, then say what you are building:

1. this file
2. `docs/IDEA.md` — why Sown, what lost, the one-sentence pitch, the competitive landscape
3. `docs/BUILD-PLAN.md` — the four days, what ships in what order, the cut lines, the risks
4. `docs/DESIGN.md` — every screen, every state, the words, and the webgold files to copy
5. `docs/DEMO-AND-PITCH.md` — the film, the submission text, the launch posts
6. `docs/RESEARCH.md` — the sources

Reference code you may read but **never modify**: `/Users/macbookair/projects/webgold` (Scrip,
the founder's Solana product; the design system and the receipt patterns come from there) and
`/Users/macbookair/projects/Umbra` (the founder's earlier Stellar project; Soroban build and
deploy scripts, Stellar Wallets Kit usage, a mainnet canary pattern). Scrip's `scrip-ui` skill
(`webgold/.claude/skills/scrip-ui/SKILL.md`) is the design contract; `docs/DESIGN.md` adapts it.

---

## 1. The product, in ten seconds

**Send money home. Part of it stays theirs.**

A person abroad sends dollars to a person at home, as they do today. Sown asks one question —
*keep how much?* — and, in the **same transaction**, turns that slice into US Treasuries (or
Mexican CETES) in the recipient's own wallet. The recipient needs nothing in advance: they tap
a link, **Face ID makes them a wallet**, and the money is theirs — dollars to spend, Treasuries
that stay. Every send prints a **receipt** anyone can open. **Every month**, if they like.

> Send $100 to Ammi. Keep 10%.
> $90 to spend. $10 of US Treasuries, hers, in her own wallet. A receipt for both.

The positioning line, everywhere the product is explained:

> Remittances are spent the week they arrive. Sown makes part of every one stay.

**What makes it Stellar.** The conversion is a **cross-contract swap on Aquarius** inside a
**Soroban** contract, so one signature does the send and the keep. The recipient's wallet is
a **passkey smart account** (OpenZeppelin's contracts through Stellar's Smart Account Kit),
created on the spot and **fee-sponsored**, so a person with no app, no seed phrase and no XLM
can claim. The assets are **real tokenized government debt that already lives on Stellar**
(Ondo USDY, Etherfuse USTRY and CETES, each with ~$2M of Aquarius liquidity against USDC), and
Stellar is the chain DTCC chose for tokenized Russell 1000 stocks, ETFs and Treasuries (first
half of 2027). When those land, a send can keep *stock*. The cash side is USDC, the asset
MoneyGram's network cashes out through Stellar wallets in 170+ countries.

**It is not** a remittance company (it moves no fiat; anchors and MoneyGram-connected wallets
do), a yield product (it never promises a return), a brokerage, a lender, a custodian or a
wallet for anything but what was sent through it. It never decides amounts: the keep rate is
the sender's, the price is Aquarius's pool at that ledger, the timing is the sender's
signature. It gives no advice.

**Five objects.**

1. A **send** — one Soroban transaction the sender signs: USDC in; the keep slice swapped on
   Aquarius; both parts placed in an envelope.
2. An **envelope** — the waiting room: a persistent entry in the Sown contract holding the cash
   (USDC) and the keep (USDY/USTRY/CETES) for whoever presents the link's secret, with a return
   date after which anyone may send it back to the sender.
3. A **claim** — Face ID creates a smart account and claims (two Face ID prompts, no XLM, no
   app), or any Stellar wallet claims (trustlines sponsored by Sown).
4. A **receipt** — the envelope entry itself, written in the same transaction as the send and
   updated by the claim: read at `/receipt/<id>`, anchored to the transaction hashes. It never
   lives only in our database.
5. A **plan** — "every month": the sender's saved intent with a reminder. Stellar has no
   standing orders; the roadmap puts the plan on the sender's smart account as a policy
   (`docs/BUILD-PLAN.md` §Roadmap).

**The number that decides everything: still-held.** The share of each keep that is still in
the recipient's wallet 30 days after the claim, read from the chain by anyone through
`measure(id)` and written into the receipt. It cannot be faked: the denominator is the
envelope's own `keep_out`, the numerator is a `balance()` the contract read itself.

## 2. The user

**The sender**: a person abroad who already sends money home with an app (Remitly, Wise,
MoneyGram, Western Union) and has, or can get, USDC on Stellar. They want the money to do more
than get spent. Their wallet is Freighter, xBull, LOBSTR or Hana (Stellar Wallets Kit).

**The recipient**: a family member at home — Lahore, Lagos, Manila, Mexico City, Buenos Aires —
with a phone, WhatsApp and no crypto wallet. They must never see a seed phrase, a reserve, a
trustline, a fee or the word "token". They tap, they see their face, they own something.

Sown is global by construction: amounts show in the viewer's own money (from their time zone,
never from a country they are asked to name), every asset row says who issues it and what the
issuer can do, and no surface names a country as "home".

## 3. Principles

1. **Non-custodial by construction.** The sender's USDC moves from the sender's wallet to the
   Sown contract and from the contract to the recipient. The contract has no function that
   lets anyone else move an envelope: not the admin, not Sown's servers. The admin can only add
   or disable a keep asset for *future* sends.
2. **No model, no operator, no program ever decides how much.** The rate is the sender's. The
   price is the Aquarius pool's at that ledger, bounded by a `min_keep_out` the sender saw. The
   timing is the sender's signature.
3. **Every money moment prints a receipt** anyone can open, anchored to a transaction.
4. **Never show a number we cannot derive from chain state.** No projected yield, no sample
   balances, no fabricated activity. A worked example is labelled arithmetic.
5. **Savings-grade, not stable.** A keep asset's price is the issuer's; it can fall; the issuer
   can freeze or claw back. The UI says so on the row, never in a banner.
6. **Failure returns a value.** `Outcome<T>`; nothing throws for control flow. Every failed
   step says what happened and that nothing moved.

## 4. Honesty requirements, non-negotiable in copy

- **Issuer powers are read from the chain, per row.** Ondo's USDY issuer account has
  `auth_revocable` and `auth_clawback_enabled` set and `auth_required` off (read 2026-10-08).
  Etherfuse's issuer (USTRY, CETES) has the same flags. The row says: "Ondo can freeze this
  balance or take it back; it needs no permission to hold." Read the flags at build time and at
  request time; never hard-code a disclosure a flag could contradict.
- **Not offered to US persons.** Ondo and Etherfuse offer to non-US persons; the sender attests
  at send that the recipient is not a US person. Say it once, above the signature.
- **"US Treasuries" means a token.** USDY is Ondo's tokenized note backed by short-term US
  Treasuries and bank deposits; its price accrues interest (Ondo's words). USTRY and CETES are
  Etherfuse Stablebonds tracking US Treasury notes and Mexican CETES. Say "US Treasuries (Ondo
  USDY)" the first time on any screen; the ticker and issuer in small type after.
- **No yield figure, ever.** Not "4%", not "earns", not "grows". The only forward-looking
  sentence is the issuer's own description of how its price moves, quoted and attributed.
- **The envelope is revocable until claimed.** The recipient's page says the sender can take an
  unclaimed send back, and when it returns by itself.
- **The claim link is the money.** Anyone with the link can claim. Say it where the link is
  shown; never put the secret in a URL our server sees (fragment only).
- **Sown's servers** is the actor wherever one must be named: they sponsor the recipient's
  wallet and fees, and nothing else. Never "relayer", "keeper", "crank", "sponsor account" on a
  surface a person or a judge reads. The code may keep those words.
- **Nothing is simulated on mainnet.** Where a surface shows testnet or a stand-in, it says so
  in the same type size as the figure.

## 5. Architecture

### The contract — `contracts/sown` (Soroban, Rust)

One contract, deployed to testnet and mainnet. `soroban-sdk = "28.0.0"` with `stellar-cli
28.1.0` (the same line; move both to 29 together once a CLI 29 release exists — mainnet and
testnet are on Protocol 29 as of 2026-10-08, and a Protocol-28 build runs there).

**Storage**

| Key | Kind | Holds |
| --- | --- | --- |
| `Config` | instance | `admin: Address`, `usdc: Address` (USDC's Stellar Asset Contract), `min_send: i128` (1 USDC = 10_000_000), `min_hold: u64` (86_400 s), `max_hold: u64` (31_536_000 s) |
| `Asset(addr)` | instance | `KeepAsset { pool: Address, in_idx: u32, out_idx: u32, enabled: bool }` — the Aquarius pool that converts USDC into this asset and the token indices inside it |
| `Count` | instance | `u64`, the next envelope id |
| `Env(id)` | persistent, TTL extended to the network maximum at every write | the `Envelope` below |

```rust
#[contracttype] pub enum State { Open, Claimed, Returned }
#[contracttype] pub struct Envelope {
    pub id: u64, pub sender: Address,
    pub cash: i128,                   // USDC left to spend
    pub keep_asset: Address, pub keep_in: i128, pub keep_out: i128, pub keep_bps: u32,
    pub claim_hash: BytesN<32>,       // sha256(secret); the secret lives in the link's fragment
    pub memo: BytesN<32>,             // sha256 of the sender's reason, or zero
    pub created_at: u64, pub created_ledger: u32, pub return_at: u64,
    pub state: State, pub claimed_by: Option<Address>, pub claimed_at: u64, pub claimed_ledger: u32,
    pub measured_at: u64, pub measured_balance: i128,   // 0 = not measured
}
```

**Instructions** (anything not listed does not exist):

| Function | Who | What it does |
| --- | --- | --- |
| `__constructor(admin, usdc)` | deployer | writes `Config`; `Count = 0` |
| `set_asset(asset, pool, in_idx, out_idx, enabled)` | admin | adds or disables a keep asset for future sends. Cannot touch any envelope |
| `send(sender, amount, keep_bps, keep_asset, min_keep_out, claim_hash, memo, return_at) -> u64` | sender (`require_auth`) | checks `amount ≥ min_send`, `keep_bps ≤ 10_000`, asset enabled, `now + min_hold ≤ return_at ≤ now + max_hold`; transfers `amount` USDC from the sender to the contract; `keep_in = amount × keep_bps / 10_000`, `cash = amount − keep_in`; if `keep_in > 0`, pre-authorises the USDC transfer to the pool and calls `pool.swap(contract, in_idx, out_idx, keep_in, min_keep_out)`, which returns `keep_out`; writes `Env(id)` with state `Open`; emits `sent`; returns `id` |
| `claim(id, secret, to)` | whoever holds the secret; `to.require_auth()` | `sha256(secret) == claim_hash`, state `Open`; transfers `cash` USDC and `keep_out` of the keep asset to `to`; state `Claimed` with `claimed_by`, `claimed_at`, `claimed_ledger`; emits `claimed` |
| `refund(id)` | the sender at any time while `Open`; **anyone** once `now ≥ return_at` | transfers both parts back to `sender`; state `Returned`; emits `refunded` |
| `measure(id)` | anyone, once, when `now ≥ claimed_at + 30 days` | reads `keep_asset.balance(claimed_by)` and writes `measured_at`, `measured_balance`; emits `measured` |
| `get(id) -> Envelope`, `count() -> u64`, `config() -> Config`, `asset(addr) -> KeepAsset` | anyone | views |

**The Aquarius call.** Pools are called directly, not through the router ("pool contracts can
be called directly for contract sub-invocations" — Aquarius docs). `swap(user, in_idx,
out_idx, in_amount, out_min) -> u128` pulls `in_amount` of the input token from `user`, which
for Sown is the contract itself, so the contract must pre-authorise that pull with
`env.authorize_as_current_contract(...)` naming the USDC `transfer(contract, pool, keep_in)`
sub-invocation. **Before writing that entry, confirm on testnet how the pool pulls tokens**
(`transfer` vs `transfer_from`): simulate a `send` against the Aquarius testnet router's
USDC/XLM pool and read the auth tree the simulation reports. The three mainnet pools, their
token order and reserves on 2026-10-08 are in `docs/RESEARCH.md` §Aquarius.

**Errors** (`#[contracterror]`): `NotFound`, `NotOpen`, `BadSecret`, `BadRate`, `TooSmall`,
`BadReturnDate`, `AssetOff`, `NotYet`, `NotSender`, `AlreadyMeasured`, `Overflow`.

**Events**: `("sent", id)` → `(sender, cash, keep_asset, keep_in, keep_out)`;
`("claimed", id)` → `(to)`; `("refunded", id)` → `(sender)`; `("measured", id)` → `(balance)`.

**Invariants the tests hold** (`contracts/sown/src/test.rs`, with a `MockPool` that swaps at a
fixed rate and pulls through `transfer`):

- `cash + keep_in == amount`; `keep_out ≥ min_keep_out`; a short fill reverts the whole send.
- Only `Open → Claimed` and `Open → Returned`; a second claim, a claim after refund and a refund
  after claim all fail with `NotOpen`.
- A wrong secret fails; the right secret with a different `to` succeeds only with `to`'s auth.
- `refund` by a stranger before `return_at` fails with `NotYet`; after it, succeeds.
- `measure` before 30 days fails; a second measure fails; the written balance equals the mock
  token's balance of `claimed_by`.
- The contract's USDC and keep-asset balances always equal the sums over `Open` envelopes
  (a property test over random sequences of send/claim/refund).
- No function reachable by `admin` changes any envelope's funds (a test enumerates the spec).

**What the admin is.** One key (the founder's, mainnet) that can call `set_asset`. It cannot
pause, upgrade (the contract is deployed without an upgrade function in v1) or move money.
`/proof` says this in those words and shows the admin address.

### Off-chain

| Piece | Job |
| --- | --- |
| **The app** (`src/`, Next.js 15 App Router, RSC by default) | the send card, the claim page, receipts, holdings, assets, proof, docs |
| **Quote** (`src/lib/quote.ts`, `/api/quote`) | simulates the pool's `estimate_swap(in_idx, out_idx, keep_in)` through RPC and returns `keep_out`, `min_keep_out` (estimate less the sender's tolerance, default 1%) and the implied price. The quote **is** the pool; nothing is interpolated |
| **Send builder** (`src/lib/send/build.ts`, `/api/send/prepare`) | builds the `send` invocation with the sender's G-address as the transaction source (one wallet signature authorises the whole tree), `return_at = now + 30 days` by default (the sender may choose 1–365 days), simulates, assembles, returns XDR. The client signs through the Wallets Kit and submits; `/api/send/record` receives the hash, verifies it on RPC and caches it |
| **Claim link** (`src/lib/link.ts`) | `/r/<id>#<secret>`: the secret is 32 random bytes, generated in the sender's browser, never sent to the server, shown once with a copy button and a WhatsApp share |
| **The relay** (`/api/relay`, `src/lib/relay/`) | Sown's servers pay for what a recipient cannot: (1) a smart-account deployment and (2) a `claim` invocation by a smart account, both in the Smart Account Kit's `{ func, auth }` shape; (3) a classic sponsored-trustline transaction for a G-address recipient (`begin_sponsoring`, optional `create_account(0 XLM)`, `change_trust` ×2, `end_sponsoring`), co-signed; (4) a fee-bump of a G-address recipient's `claim`. It **inspects before it signs** (`src/lib/relay/verify.ts`): the envelope named must be `Open` on chain, each envelope is sponsored once per shape, the instruction list must be exactly the allowed shape, and a per-IP rate limit applies. Signing key: `SOWN_SPONSOR_SECRET`; it alerts (log and optional Telegram) under 20 XLM |
| **Reader** (`src/lib/envelope/read.ts`) | `get(id)` through RPC simulation, the creating and claiming transactions from the cache or `getEvents`, the issuer flags from Horizon. A receipt renders from a cold RPC with the database empty |
| **Cache** (`src/lib/db/`, SQLite via drizzle, `var/sown.<network>.db`) | `envelopes` (id, tx hashes, the decoded entry), `measurements`, `fx`. Optional: with `SOWN_DB` unset every page reads the chain |
| **Local money** (`src/lib/fx/`, `/api/fx`) | the viewer's currency from their time zone, ExchangeRate-API's open daily rate, named in the title of every converted amount. Copied from webgold `src/lib/fx/` |
| **Catalogue** (`src/lib/assets/catalogue.ts`) | the keep assets: name, ticker, issuer, SAC address, Aquarius pool, indices, decimals (7), the issuer's own one-line description and the flags read from the issuer account. A test reads the catalogue and the contract's `asset()` for each entry and fails if they drift |
| **Measurer** (`scripts/measure.ts`) | calls `measure(id)` on claimed envelopes past 30 days; run by cron. Never mentioned on a surface |

### Data model

`envelopes` (id, network, send_tx, claim_tx, refund_tx, sender, cash, keep_asset, keep_in,
keep_out, keep_bps, created_at, return_at, state, claimed_by, claimed_at, measured_at,
measured_balance, memo_text if the sender chose to store it), `fx` (code, rate, read_at). A cache
of the chain, never a ledger of record.

### Stack and versions (pinned; a test reads `package.json` and fails on drift)

| Piece | Version | Why this one |
| --- | --- | --- |
| Node | 22 | installed |
| Next.js | 15.x | the same major as Scrip, so its components copy without changes |
| `@stellar/stellar-sdk` | **16.3.1** | `smart-account-kit@0.8.0` requires `^16.3.0`; 16.3.x carries Protocol 28 XDR and runs against Protocol 29 (a Day-0 smoke test confirms). Do not move to 17 while the kit is in the bundle |
| `smart-account-kit` | **0.8.0** (2026-09-08) | passkey smart accounts on OpenZeppelin's audited account contract; testnet and mainnet verifier and policy contracts are deployed (`docs/RESEARCH.md` §Smart accounts). Unaudited integration software: keep balances small, say so on `/proof` |
| `@creit-tech/stellar-wallets-kit` (JSR) | **2.5.x** | the kit's peer range is `>=2.1.0 <2.6.0`. Install from JSR (`npx jsr add @creit-tech/stellar-wallets-kit@2.5.0`); do not also install the npm `@creit.tech/...` 2.7 |
| `soroban-sdk` | 28.0.0 | matches `stellar-cli` 28.1.0, the latest release line on 2026-10-08 |
| `stellar-cli` | 28.1.0 | the machine has 27.0.0; upgrade on Day 0 |
| Rust target | `wasm32v1-none` | installed |
| `@aquariusdefi/sdk` | 0.5.1, optional | only if its `pools.forPair` and `quote` save time; the contract calls the pool directly either way |
| drizzle-orm + better-sqlite3 | current | as in Scrip |
| Vitest | current | the offline suite |

## 6. Stellar features used, and why

| Feature | Where | Why it matters here | What was considered instead |
| --- | --- | --- | --- |
| **Soroban contract with a cross-contract AMM call** | `send` → Aquarius pool `swap` | one signature does the send and the keep; the min-out is enforced by the pool in the same transaction; the envelope is written in the same transaction | a classic path payment is simpler but cannot write a contract entry, and a smart account cannot be the destination of a classic payment |
| **Stellar Asset Contracts (SAC)** | USDC, USDY, USTRY, CETES as Soroban tokens | real issued assets, held by a contract address with no trustline; transfers to a G-address need its trustline, which the relay sponsors | a Sown-issued token would be a stand-in; the point is the real asset |
| **Passkey smart accounts** (OpenZeppelin `stellar-accounts` via Smart Account Kit; secp256r1 is a host function since Protocol 21) | the recipient's wallet | a person with no app, no seed phrase and no XLM claims with Face ID; the account is theirs (the kit's deployer is sign-only and never controls it) | a G-keypair hidden in the browser is custody by another name; a hosted wallet is custody |
| **Fee sponsorship** (Soroban transactions submitted by Sown's funded account; **fee-bump** and **sponsored reserves** for G-address recipients) | the relay | the recipient pays nothing and needs no XLM; the sponsor's reserves come back if trustlines are later closed | OpenZeppelin Channels (hosted) works on testnet; mainnet limits are undocumented, so Sown's own funded account pays and the relay inspects every request |
| **Authorization framework** (`require_auth`, invoker-contract auth, `authorize_as_current_contract`) | `send`, `claim`, the pool call | one wallet signature authorises the whole tree; the contract authorises its own token pull for the pool; `claim` binds `to` to an authorisation so a watcher cannot redirect it | — |
| **Persistent storage with TTL** | `Env(id)` | the receipt lives in the ledger, restorable after archival, not only in our database | events alone expire from RPC history |
| **Aquarius AMM liquidity** (USDY/USDC $2.0M, USTRY/USDC $2.2M, CETES/USDC $2.3M on 2026-10-08) | the keep conversion | real tokenized government debt with real depth on Soroban; the SDEX also quotes USDC→USDY one hop deep, which the roadmap uses for XLM senders | — |
| **Issuer flags read from Horizon** | per-row disclosure | the chain says what the issuer can do; Sown never paraphrases it from a PDF | — |
| **Claimable balances** | **not used in v1**, said on `/docs/why-not-claimable-balances` | a native claimable balance is the Stellar way to pay someone who does not exist yet, but only a classic account can claim one, and a passkey smart account is a contract. The envelope is the smart-account-era equivalent. A G-address recipient path through claimable balances is roadmap | — |
| **Anchors / MoneyGram** | "Cash out" links on the recipient's page | USDC on Stellar is what MoneyGram-connected wallets (Vesseo, LOBSTR, Decaf) cash out at agents in 170+ countries; Sown links, it does not integrate (MoneyGram Ramps needs an allowlisted domain and certification) | SEP-24 through SDF's test anchor would be a testnet-only demonstration; cut |

## 7. Routes

**Public, paper:** `/` the send card and how it works; `/r/[id]` the claim page (secret in the
fragment); `/receipt/[id]`; `/assets` what can be kept, with disclosure read from the chain;
`/proof` the contract, the pools, the sponsor's balance, the counts, the still-held figures,
all read from the chain; `/docs/*` (how a send works, the envelope, why not claimable balances,
what the issuer can do, fees and who pays them, the limits). `/receipt/[id]` renders an
`opengraph-image`.

**The sender (connected through the Wallets Kit):** `/sent` every envelope from this address,
each with its state and its link to reshare (the secret is in this browser's storage only; a
lost link means the sender refunds and sends again); `/plan` the monthly intent (local,
reminder by calendar file).

**The recipient (passkey):** `/mine` what this account holds (USDC and each keep asset, read
from the chain, in local money), every claim, "Move to a wallet" (a `transfer` to a G-address
they paste), "Cash out" (links to MoneyGram-connected Stellar wallets and anchors.stellar.org).

**API:** `quote`, `send/prepare`, `send/record`, `relay`, `envelope/[id]`, `holdings/[addr]`,
`fx`, `health`.

## 8. Design system

Scrip's, adapted (`docs/DESIGN.md`): paper `#f7f5ef` on every consumer screen, ink only on
`/proof`; one accent `#2b4acb`; green and red for money outcomes only; Instrument Sans for
words, IBM Plex Mono for figures, Fraunces for the wordmark only. The **envelope is the stub**:
the receipt's shape (perforated top edge, ruled rows, the keep units as the largest figure)
drawn at the same five sizes. Copy `webgold/src/styles/tokens.css` verbatim and alias; never
redeclare a palette value; no Tailwind utility classes; no emoji; sentence case; one primary
button per screen; a trust line above every signature.

**Words on surfaces** (consumer → code): keep → `keep_bps`/`keep_out`; the envelope → `Envelope`;
claim → `claim`; take it back → `refund` (by the sender); returned by itself → `refund` (after
`return_at`); still held → `measure`; Sown's servers → the relay; your wallet → the smart
account; US Treasuries (Ondo USDY) → `USDY`. Never: token, yield, APY, relayer, sponsor,
trustline, reserve, gas, smart contract (say "the Sown contract" on `/proof` only), seed phrase.

## 9. Standing policies

- **Money-critical code requires tests**: the slice arithmetic, the min-out, the state machine,
  the secret check, the relay's shape inspection, the catalogue/contract parity, the quote
  decoder, the receipt reader. `lint` + `typecheck` + `test` + `cargo test` green before anything
  ships.
- **Two lists that drift is the dominant defect shape.** The contract id (three places), the
  catalogue and the contract's `asset()` table, the pinned versions and `package.json`, the docs
  nav and the pages: write the test that reads both.
- **Never invent a number on a surface.**
- **Disclose the issuer on every asset row**, from flags read off the chain.
- **The relay signs only what it has inspected**, and at most once per envelope per shape.
- **Mainnet money is small and the founder's** until the still-held figure exists: `/proof`
  shows the sponsor's balance and the total ever sponsored.
- **No background process** except the measurer. Sown has nothing to race.

## 10. Commands

```bash
npm run dev            # next dev --turbopack
npm run build          # next build
npm run lint
npm run typecheck
npm run test           # vitest, offline (mocked RPC fixtures recorded from testnet)
npm run contract:build # stellar contract build (contracts/sown) + copy the wasm + its sha256
npm run contract:test  # cargo test -p sown
npm run contract:deploy:testnet   # deploy, call __constructor, set_asset for the testnet stand-in; writes deployments/testnet.json
npm run contract:deploy:mainnet   # the same with the three real pools; writes deployments/mainnet.json; prints the sha256 to put on /proof
npm run battery:testnet           # the on-chain battery: send, claim (G-address), claim (passkey, headless WebAuthn), refund, measure
npm run smoke:mainnet             # one $1 send and claim from the founder's wallets, timed; refuses to run twice in an hour
npm run measure                   # scripts/measure.ts
npm run preflight                 # what a deploy and a hundred sponsored claims cost, read from the chain
```

## 11. Definition of done (the submission)

1. `send` → `claim` → `/receipt/<id>` on **mainnet**, with real USDC and real USDY, from the
   founder's Freighter to a passkey account created on a phone, in under 60 seconds end to end,
   recorded.
2. The same flow on testnet in the battery, green, plus the Rust suite and the offline suite.
3. `/proof` shows the contract's sha256 (dumped back from the chain and compared), the three
   pools, the admin address, the sponsor's balance, the counts, and the words "unaudited".
4. Every state in `docs/DESIGN.md` exists and was seen in a browser at 375 px and 1440 px.
5. The two-to-three-minute film, the README above the fold (one sentence, the GIF, the mainnet
   contract id, the quickstart), and the submission fields pasted on the platform — before the
   cutoff, with a day to spare.
6. Nothing on a surface says keeper, relayer, trustline, token, yield or APY.

## 12. What runs where

| | Mainnet | Testnet | Simulated / stand-in |
| --- | --- | --- | --- |
| The contract | yes, the product | yes, the battery | — |
| USDC | Circle's | Circle's testnet USDC (`GBBD47IF…FLA5`), also the SDF test anchor's | — |
| Keep assets | USDY, USTRY, CETES | **none exist on testnet**; the battery keeps XLM through the Aquarius testnet USDC/XLM pool and the UI labels it "stand-in" | — |
| Aquarius | the three pools | the testnet router's pools | the Rust suite's `MockPool` |
| Smart accounts | the kit's mainnet verifiers | the kit's testnet verifiers, Channels testnet for development | the battery's headless WebAuthn authenticator |
| Fees | Sown's sponsor account (the founder's XLM) | Friendbot + Channels testnet | — |
| Cash out | links to MoneyGram-connected wallets and the anchor directory | — | — |
| The worked example on `/` | arithmetic, labelled | | |

---

## Known drift

| This file says | The code does | Why |
| --- | --- | --- |
| §5 `claim(id, secret, to)` checks `sha256(secret) == claim_hash` and calls `to.require_auth()`; the envelope stores `claim_hash` | `claim(id, to, sig)`: the link's 32-byte secret is an **ed25519 seed**, the envelope stores its public key (`claim_key`), and the claim carries a signature by that key over `("claim", contract, id, to)` as ScVal XDR (`claim_message` in `lib.rs`, `claimMessage` in `src/lib/envelope/claim.ts`, the same bytes held by a test on each side). There is no `to.require_auth()`: the signature is the authorisation and it names the destination | With a preimage, the secret would travel in the claim's arguments to Sown's relay, every RPC node and the ledger, and anyone who saw a pending or failed claim could replay it to their own address. §4 already says the secret must never reach a server. A signature keeps the seed in the browser and makes a claim impossible to redirect. It also removes the second Face ID: iOS lets a page start one WebAuthn ceremony per tap, and the second would have come ~9 s after it |
| §5 "Two Face ID prompts"; DESIGN onboarding: Face ID #1 makes the wallet, #2 claims; a classic wallet approves twice | **one** Face ID (the wallet is made; Sown's servers then deploy it and submit the claim the link signed), and **one** approval for a classic wallet on its first claim (the sponsored trustlines), **none** once it can hold the assets | Follows from the row above. Battery: `passkeyPrompts=1` |
| §5 `refund(id)` | `refund(id, by)`, `by.require_auth()`; before `return_at` only `by == sender` succeeds, a stranger gets `NotYet` | Soroban cannot tell who is asking without an address that authorises; the spec's own test ("a stranger before return_at fails with NotYet") needs one |
| §5 errors list | adds `BadPool` (12: `set_asset` with a pool that does not trade USDC at `in_idx` for the asset at `out_idx`) and `NotClaimed` (13: `measure` on an envelope that is not claimed). `BadSecret` (3) and `NotSender` (9) are kept in the enum so the numbering matches, and are never returned: a bad signature aborts in the host, and a stranger's refund is `NotYet` | An admin typo in a pool address would otherwise make every later send fail inside the swap |
| §5 `send` takes `keep_out` from `pool.swap` | the contract counts `keep_out` from its own balance of the keep asset before and after the swap, and refuses (`TooSmall`) a fill below `min_keep_out` or of zero | Never trust a returned number for money. Test: `sown_counts_what_arrived_not_what_the_pool_says` |
| §5 `claimed_at` / `claimed_ledger` are the claim's | they also record when a **returned** envelope went back | The claim page says "The sender took this back on 3 Oct" from the ledger, not from a cache |
| §5 relay shape (4) a fee-bump of a classic recipient's `claim` | gone. Every claim, into either kind of wallet, is a `claim` invocation the sponsor submits with no authorisation entries (shape 2). The passkey path is one request (`kind: "passkey"`: the inspected deployment, then the claim); a classic wallet's trustlines are prepared by the relay, signed by the wallet, inspected and co-signed last (shape 3) | Nothing about a claim needs the recipient's signature any more, so there is nothing to fee-bump |
| §12 testnet USDC is Circle's (`GBBD47IF…FLA5`) | testnet runs on **Aquarius's test USDC** (`USDC:GAHPYWLK…LAGER`, SAC `CAZRY5GS…6LF5`), the asset in the only Aquarius testnet USDC/XLM pool (`CD3LFMML…32BX`, index 0 USDC, 1 XLM, 0.30%) | Circle's testnet USDC has no Aquarius pool against XLM on 2026-10-08. Aquarius's docs: acquire test assets by swapping XLM through the AMM; the battery does |
| §5 "persistent, TTL extended to the network maximum at every write" costs nothing worth naming; DESIGN's sheet says "Network fee about $0.001" | the maximum is kept, and it is the whole cost: a testnet send charges 1.118 XLM of which 1.114 is rent; on mainnet (rent at the floor rate, and a forced 120-day minimum on new entries) a send is about 0.2 XLM. The confirm sheet shows the fee from the transaction's own simulation, in XLM and dollars | `docs/RESEARCH.md` §13, measured. Shortening the TTL would save about 0.07 XLM on mainnet and cost the receipt two months of life |
| §5 every simulation is taken as is | every simulation that will be submitted asks the RPC for 1,000,000 extra instructions (`INSTRUCTION_LEEWAY`) | An Aquarius swap spent 360 more instructions on the ledger than in simulation and failed (`6bc95ada…`). The headroom costs about 2,500 stroops |
| §5 `soroban-sdk 28.0.0` with the machine's Rust | `rust-toolchain.toml` pins Rust 1.91.1 for this repository | soroban-sdk 28 requires rustc ≥ 1.91, the machine had 1.90, and stellar-cli 28.1.0 refuses to build contracts with exactly 1.91.0 |
| §5 the client submits the signed send, then `/api/send/record` receives the hash | `/api/send/record` receives the **signed transaction**, checks it is exactly one `send` on the Sown contract from its own source, submits it, waits, and caches the envelope | One path for every wallet and every RPC: mainnet's public RPC's CORS policy is not documented, and a hash alone cannot be verified until it lands |
