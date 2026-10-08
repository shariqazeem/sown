# Build plan

> Four days: Wednesday evening 8 Oct to the 12 Oct deadline, whose hour is unknown — so the
> submission goes in on **Saturday 11 Oct** and Sunday is a buffer. Each day ends with
> something that runs. Cut lines are ordered: cut from the bottom of the list, never the top.
> Umbra's lesson governs: deploy early, run it once for real, record it, and spend the last day
> on evidence a judge can see.

## Day 0 — Wednesday 8 Oct, evening (≈ 3 h): decide nothing, verify everything

**Founder, by hand (no agent can do these):**

- [ ] Confirm the deadline time and the submission form's fields on demo.stellarpassport.xyz;
      paste the fields into `docs/DEMO-AND-PITCH.md` §Submission so the copy can be sized.
- [ ] Check the Meridian/HackMeridian registration cutoff (a listing says 9 Oct) and apply if
      Lisbon is on the table.
- [ ] Pick the name and check a domain (sown.*; fall back to Keeps / Portion). A real domain
      is functional, not cosmetic: Scrip found Phantom blocks raw-IP hosts, and passkeys
      (WebAuthn) are bound to an origin — the recipient's wallet is registered to the domain it
      was created on, so **the domain must be final before the first mainnet claim**.
- [ ] Fund: a mainnet **sponsor** account with ~60 XLM (contract deploy ≈ a few XLM; each
      sponsored smart-account deploy and claim costs well under 1 XLM in fees plus rent;
      G-address trustline sponsorship locks 0.5 XLM per trustline, returned if closed); a
      mainnet **sender** wallet (Freighter) with ~20 USDC (swap XLM→USDC in LOBSTR or Freighter
      — the SDEX path is one hop). Keep the admin key for `set_asset` on this machine only.
- [ ] Ask one real person to be the recipient in the film (their phone, their face).

**Agent, with the founder present:**

- [ ] `brew upgrade stellar-cli` to 28.1.0 (machine has 27.0.0); `node 22`; create the repo
      from Scrip's conventions (`tokens.css`, `stub/`, toast, skeletons, `fx/` copied).
- [ ] Smoke 1 — **the kit on Protocol 29**: run `smart-account-kit/demo` against testnet with
      Channels testnet; create a passkey wallet, fund it, transfer XLM. If XDR errors appear with
      SDK 16.3.1, record them: passkeys become a cut candidate on Day 2.
- [ ] Smoke 2 — **Aquarius from a contract**: with the CLI, swap 1 test USDC → XLM on the
      Aquarius testnet USDC/native pool from a G-account (`estimate_swap` then `swap`); then
      simulate the same `swap` with a throwaway contract as `user` and read the auth tree the
      simulation returns. Write the exact `authorize_as_current_contract` entry into
      `contracts/sown/src/lib.rs` as a comment before any code.
- [ ] Smoke 3 — **the three mainnet pools**: `estimate_swap` by simulation on each of
      USDY/USDC, USTRY/USDC, CETES/USDC for 1, 10 and 100 USDC; record the implied prices in
      `docs/RESEARCH.md` as the day's reading.

Done when: three smoke results are written down, the toolchain builds a hello-world contract,
and the founder has the fields and the cutoff.

## Day 1 — Thursday 9 Oct: the contract and a send that lands

- [ ] `contracts/sown`: `__constructor`, `set_asset`, `send`, `claim`, `refund`, `measure`,
      views; errors; events; persistent `Env(id)` with TTL extended to the max.
- [ ] `src/test.rs`: the invariants in `CLAUDE.md` §5, with `MockPool` and the SDK's mock
      tokens. `cargo test` green.
- [ ] Deploy to testnet; `set_asset(XLM SAC, testnet USDC/native pool, idx…)` as the stand-in
      keep asset; write `deployments/testnet.json`; a CLI `send` → `claim` → `refund` battery
      script (`npm run battery:testnet`, G-addresses only today).
- [ ] The app: `/` with the send card (amount, keep rate 5/10/20/other, asset chips, the live
      quote from `/api/quote`, local money), the confirm sheet (what moves, what it becomes, the
      least it can become, the fee, the issuer's powers, the trust line), Wallets Kit connect,
      `/api/send/prepare` → sign → submit → `/api/send/record` → `/receipt/<id>` with the stub
      printing. The claim link shown once with copy + WhatsApp share.
- [ ] `/r/<id>`: states loading / open / claimed / returned; **claim with a Stellar wallet**
      (G-address): sponsored trustlines through `/api/relay` (shape 3), then the `claim` invoke
      fee-bumped (shape 4). Two wallet prompts on a fresh wallet, one if trustlines exist.
- [ ] `/receipt/<id>` reads the contract, never the database; the "built from the ledger" foot.

Done when: on testnet, Freighter A sends 10 test USDC keeping 10%, Freighter B claims, and
the receipt shows cash, keep units, the pool price, both transaction hashes. Recorded as a
GIF for the README.

## Day 2 — Friday 10 Oct: Face ID, mainnet, proof

- [ ] Passkeys: `createWallet(…, { autoSubmit: false })` → `/api/relay` shape 1 → connect;
      `kit.execute(sown, 'claim', [id, secret, account])` → shape 2. Two Face ID prompts, zero
      XLM. In-app browsers without WebAuthn get "Open in Safari / Chrome" with the link intact
      (the fragment survives a copy).
- [ ] `/mine`: holdings read from the chain for the connected account (USDC + each keep asset),
      in local money; the list of claims; "Move to a wallet" (a `transfer` to a pasted
      G-address, with the trustline check and a plain sentence if it is missing); "Cash out"
      links (Vesseo, LOBSTR, Decaf, anchors.stellar.org) with the honest line that Sown links
      and does not move fiat.
- [ ] The relay's inspection (`src/lib/relay/verify.ts`) and its tests: exact shapes, the
      envelope must be `Open`, once per envelope per shape, per-IP limit, the balance alert.
- [ ] Battery on testnet now includes the passkey path with a headless WebAuthn authenticator
      (the kit's `agent-browser` helper).
- [ ] `/assets` (three rows, flags read from Horizon at request time), `/sent`, `/proof` (the
      contract id and sha256 dumped back from the chain, the admin, the sponsor's balance and
      total sponsored, the three pools and their reserves, counts, "unaudited").
- [ ] **Mainnet**: deploy the contract (dump and compare the sha256), `set_asset` ×3, then
      `npm run smoke:mainnet`: $1 send from Freighter keeping 10% into USDY, claimed on a phone
      with Face ID. Timed. Both hashes into `/proof` and the README.
- [ ] README above the fold: one sentence, the GIF, the mainnet contract id, the three-command
      quickstart.

Done when: a stranger with a phone and no wallet can claim a real envelope on mainnet, and
`/proof` reads it back.

## Day 3 — Saturday 11 Oct: every state, the film, submit

- [ ] Every state in `DESIGN.md` seen at 375 px and 1440 px: empty, loading (skeletons, never
      spinners), waiting (the claim page while a transaction confirms), failed (what happened,
      nothing moved, one action), returned, expired, offline. `error.tsx`, `not-found.tsx`.
- [ ] `opengraph-image` for `/receipt/<id>`; `/docs/*` (five short pages); `/plan` (the monthly
      intent, local, with an `.ics` reminder and the honest sentence).
- [ ] Two friends claim real envelopes ($1 each) on their own phones; fix what confused them;
      their receipts go on `/proof` as "outside the team" (team wallets declared in
      `src/lib/team.ts`, as Scrip does).
- [ ] The film: the founder records the silent captures listed in `DEMO-AND-PITCH.md`; the
      agent records the receipt and proof pages with Playwright; edit to 2:30 with captions.
- [ ] Submission fields pasted, video linked, repo public, **submitted by Saturday night**.
- [ ] Launch posts drafted (not posted) in `DEMO-AND-PITCH.md`.

## Day 4 — Sunday 12 Oct: buffer

- [ ] Fixes only. No new features (a new feature is a new way to break the demo).
- [ ] `scripts/measure.ts` on a cron for the 30-day still-held line (the first reading lands
      on 9–10 November, in time for Breakpoint conversations).
- [ ] If the platform allows edits: refresh the video link and the counts.
- [ ] Post the launch thread once the submission is confirmed. Draft the HackMeridian
      application with the mainnet evidence.
- [ ] Keep the sponsor topped up; do not redeploy during the hours judges are likely to look.

## Cut lines, in order (cut from the bottom)

1. `measure()` and the still-held line → "measured from 9 Nov" on the receipt instead.
2. `/plan` → a sentence on the receipt: "Send again next month from your sends page."
3. USTRY and CETES → USDY only; the catalogue still shows the mechanism.
4. "Move to a wallet" on `/mine` → "Cash out" links only.
5. OG image, `/docs` beyond two pages.
6. **The passkey claim** → the claim page offers "Claim with a Stellar wallet" plus "Get a
   wallet" (Freighter mobile / LOBSTR / Vesseo) and the film shows a G-address claim. The
   contract, the send and the receipts do not change. Decide by **Friday 18:00**: if the
   passkey path has not claimed a testnet envelope by then, cut it and say so in the README
   ("smart-account claims are built on a 0.8 kit; the G-address path is the one on mainnet").
7. Never cut: the mainnet send and claim, the receipt read from the chain, `/proof`, the film.

## Risk register

| # | Risk | Likelihood | Fallback |
| --- | --- | --- | --- |
| 1 | `smart-account-kit@0.8.0` (SDK 16.3.1, verified under Protocol 27) misbehaves on Protocol 29 | medium | Day-0 smoke decides; cut line 6; the product still ships with G-address claims |
| 2 | The Aquarius pool's token pull needs an auth entry the contract gets wrong (`transfer` vs `transfer_from`, args order) | medium | Day-0 smoke reads the real auth tree from a simulation; the Rust `MockPool` mirrors it; if it still fails on testnet, route through the router's `swap_chained` instead of the pool, which the docs also allow |
| 3 | Transaction budget: a `send` with a cross-contract swap plus a persistent write exceeds limits or costs more than expected | low | measure on Day 0 (resources from simulation); if large, drop the `memo` and shorten the TTL extension to 6 months |
| 4 | The sponsor account drains (a faucet-shaped abuse, Scrip's lesson) | medium | the relay sponsors only `Open` envelopes, once per shape, with a per-IP limit; `/proof` shows the balance; alert under 20 XLM; the founder tops up before the film |
| 5 | WebAuthn fails inside WhatsApp's or Instagram's in-app browser | high on Android | "Open in Safari / Chrome" with the link intact; test on both phones on Day 2 |
| 6 | A passkey registered on the dev origin is useless on the final domain | certain if the domain changes | fix the domain on Day 0; mainnet claims only on the final origin |
| 7 | USDY/USTRY/CETES issuer freezes or claws back during judging | very low | disclosed on every row from the chain's flags; the receipt would show the measured balance honestly |
| 8 | Public RPC rate limits or outages during the demo | medium | a paid RPC endpoint env var (`SOWN_RPC_URL`) ready; every read passes a limiter (Scrip's `limiter.ts` pattern); the film is a recording, never live |
| 9 | The recipient on mainnet cannot cash out because no anchor is integrated | certain by design | the page says it in words and links the wallets that do; the roadmap names MoneyGram Ramps' production preview |
| 10 | The deadline hour is earlier than assumed | unknown | submit Saturday; the Sunday buffer exists for this |
| 11 | A judge asks why not claimable balances | certain | `/docs/why-not-claimable-balances` answers in three sentences, and the proof page links it |
| 12 | A judge asks "isn't this just a remittance app" | likely | the first line of every surface is the keep; the receipt shows the keep's units largest; the still-held number is on the roadmap with a date |
| 13 | Wallet quirks: Freighter adding a fee or refusing a Soroban tx whose source differs from the connected account | low | the sender is always the transaction source; the relay only signs envelopes it inspected (Scrip's "wallet signs first, relayer last") |
| 14 | Time: the founder loses a day | medium | the cut lines above, decided at fixed hours (Fri 18:00, Sat 12:00) |

## Budget (mainnet)

- Contract deploy: a few XLM (upload + instance). Measure with `npm run preflight`.
- Sponsor: ~60 XLM covers the deploy, ~50 passkey claims and ~20 G-address trustline
  sponsorships (0.5 XLM each, reclaimable).
- Sends: $20 USDC → ten $1–2 sends for the smoke, the film and two friends.
- Nothing else. No paid RPC unless the public one fails on Day 2.

## Roadmap after the hackathon

**For HackMeridian (25–26 Oct, Lisbon; upside, not plan):**

- **The monthly rule on the account.** A `MonthlyKeep` policy contract (`Policy` trait:
  `install / enforce / uninstall`) installed on a context rule of the sender's smart account
  that lets Sown's service signer invoke `send` for a named recipient at most once per 30 days
  up to a cap. The account enforces the rule; Sown cannot exceed it; the sender removes it
  with one tap. This is Scrip's rule, made native to Stellar's account model.
- **Direct delivery** when the recipient already has a wallet (an address instead of a link):
  the same `send` with `to` set; and a native claimable-balance path for G-address recipients.
- **XLM and EURC senders** through the Aquarius XLM/USDC pool inside `send`.

**Q4 2026:**

- **Cash out inside Sown**: SEP-45 web auth for contracts (the test anchor already serves it)
  + SEP-24 withdrawals; MoneyGram Ramps production preview for a real pickup; local anchors by
  the viewer's currency.
- **The still-held number** as the headline on `/proof`, measured by anyone.
- **Revenue without custody**: an Aquarius provider-fee collector on the keep conversion,
  disclosed on every receipt in basis points.
- **Family envelopes**: several claimants with exact shares; a date an envelope opens
  (the Vested idea).

**2027, when DTC assets reach Stellar:**

- **The registered envelope**: for auth-required assets the issuer must authorise the Sown
  contract's balance and the recipient's; Sown keeps the recipient's identity attestation off
  chain and presents it where the issuer's flow asks. Stocks and ETFs become catalogue rows.
- Dividends and corporate actions on the receipt, read from the issuer's own events.
