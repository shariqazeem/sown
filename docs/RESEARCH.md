# Research

> Every factual claim the plan rests on, with its source and the date it was read. "Read"
> means I opened the page or queried the endpoint on that date. "Founder-supplied" means the
> founder pasted it and I could not confirm it; treat as unverified. Numbers read from Horizon,
> Stellar RPC, stellar.expert and the Aquarius API are point-in-time; re-read them before they
> go on a surface. Nothing here is an estimate unless marked **estimate**.

All reads: **2026-10-08** unless stated.

## 1. The hackathon

| Claim | Source | Status |
| --- | --- | --- |
| "Find Your Way is a hackathon designed to help builders gain hands-on experience with Stellar and prepare for HackMeridian in Lisbon…" | https://demo.stellarpassport.xyz/events/b/find-your-way-meridian-hackathon (the event page redirects to this URL; it shows "Live now", "Hosted by B", a Sep 1 date line and the description; **no deadline, no criteria, no prizes, no project list are rendered**) | read |
| Dates 1 Sep – 12 Oct 2026 | https://stellarpassport.xyz (lists the event with those dates; no separate submission deadline) | read |
| Judging: technical execution, meaningful use of Stellar, originality, potential impact, user experience, presentation; prizes 2,000 / 1,000 / 500 USDC + two × 250; University Track (Chile only); ~45 projects, 262 members | pasted by the founder | founder-supplied; **not visible on the pages I could read — confirm on the platform** |
| Exact cutoff time on 12 Oct | not published anywhere I could read | **unknown — the founder must confirm; the plan submits on 11 Oct** |
| Stellar Passport: passkey sign-in, a Stellar wallet with no seed phrase, on-chain non-transferable stamps, a monthly leaderboard | https://stellarpassport.xyz | read |
| HackMeridian: 25–26 Oct 2026, Lisbon; "Apply for HackMeridian" and "Get your tickets" links; no tracks, prizes or criteria on the page | https://meridian.stellar.org/hackmeridian | read |
| Meridian 2026: 28–29 Oct, Convento do Beato, Lisbon; a listing gives **9 Oct 2026** as a registration cutoff (unclear whether for the conference or the hackathon) | https://cryptoast.fr/evenements-crypto-web3-blockchain-nft/meridian-2026-stellar-28-10-2026/ | read via search summary; **founder should check tomorrow at the latest** |
| HackMeridian "Genesis" and "Scale" tracks, up to $30k in XLM | pasted by the founder | founder-supplied; not found on the page |
| HackMeridian 2025 (Rio): 400+ builders, 110+ submissions, 56 Open Innovation and 35 Composability projects; Innovation winners The Simple Fund, 4Bridge, Stellar Forge; Composability winners Lance, Star Lends, Panorama Block; the page does not describe the projects | https://stellar.org/blog/foundation-news/the-blueprint-at-meridian-2025 | read |
| Pacta (Istanbul 2026, 1st Scale), a Brazil PIX kit (São Paulo 2026), PayZoll (Build Better 2025), Decaf/Etherfuse/DeFindex (i³) | pasted by the founder | founder-supplied; a search found the Istanbul IBW 2026 hackathon listing but no winners page |
| Umbra Wallet, 3rd, Stellar Hacks: Real-World ZK 2026; what it built | `/Users/macbookair/projects/Umbra/README.md` and `docs/JUDGE_REVIEW.md` | read |

## 2. The network, on the day

| Claim | Source | Status |
| --- | --- | --- |
| Mainnet: Protocol **29**, stellar-core 29.0.0, Horizon 29.0.0, latest ledger 64,832,620 | `GET https://horizon.stellar.org/` | read |
| Testnet: Protocol 29, core 29.0.0 | `GET https://horizon-testnet.stellar.org/` | read |
| Protocol 26 "Yardstick" (mainnet 6 May 2026): CAP-77 governed freeze by validator quorum; a contract that owns a SAC can govern balances; Protocol 27 "Zipper" (mainnet after a 8 July 2026 vote): auth delegation for custom accounts (CAP-0071-01), two new host functions, first in soroban-sdk 27 | https://stellar.org/blog/foundation-news/yardstick-stellar-protocol-26 · https://stellar.org/blog/foundation-news/stellar-zipper-protocol-27-upgrade-guide · https://stellar.org/blog/foundation-news/quorum-freeze-cap-77-governed-onchain-incident-response | read via search summaries |
| Transactions hold 1–100 operations; **smart-contract transactions hold exactly one**; all-or-nothing; preconditions: time bounds, ledger bounds, min sequence number (`minSeqNum ≤ S < tx.seqNum`), min sequence age/gap, up to two extra signers; memos text/id/hash/return | https://developers.stellar.org/docs/learn/fundamentals/transactions/operations-and-transactions | read |

### Versions

| Piece | Version, date | Source |
| --- | --- | --- |
| `@stellar/stellar-sdk` | 17.2.1 (2026-10-01); 16.3.1 (2026-10-01, backport); 16.3.0 (2026-08-28) added Protocol 28 XDR; 17.1.0 added `getClaimableBalanceIdFromResult` | `npm view`; https://github.com/stellar/js-stellar-sdk/releases |
| `smart-account-kit` | **0.8.0** (2026-09-08); 0.7.0 (09-04), 0.7.1 (09-08); repo last pushed 2026-09-18, 5 stars | `npm view smart-account-kit time`; https://api.github.com/repos/stellar/smart-account-kit |
| `smart-account-kit` peer deps | `@creit-tech/stellar-wallets-kit >=2.1.0 <2.6.0` (the **JSR** name), `@stellar/stellar-sdk ^16.3.0` | https://raw.githubusercontent.com/stellar/smart-account-kit/main/package.json |
| Stellar Wallets Kit | npm `@creit.tech/stellar-wallets-kit` 2.7.1; JSR `@creit-tech/stellar-wallets-kit` 2.7.1; 2.5.0 exists on npm; repo pushed 2026-10-07 | `npm view`; https://jsr.io/@creit-tech/stellar-wallets-kit/meta.json |
| `passkey-kit` | 0.19.1 (legacy; superseded by the Smart Account Kit) | `npm view` |
| `soroban-sdk` | 29.0.0 (2026-10-07); 28.0.0 (2026-09-18); 27.0.6 (08-13) | https://crates.io/api/v1/crates/soroban-sdk/versions |
| OpenZeppelin crates `stellar-accounts`, `stellar-tokens`, `stellar-contract-utils` | 0.7.2 (2026-06-09) | crates.io |
| `stellar-cli` | v28.1.0 (2026-09-26); v28.0.0 (08-26); v27.1.0 (07-31) | https://api.github.com/repos/stellar/stellar-cli/releases |
| Local machine | stellar 27.0.0, cargo 1.90.0, targets `wasm32-unknown-unknown` and `wasm32v1-none`, node v22.20.0 | shell |
| `@aquariusdefi/sdk` | 0.5.1 | `npm view` |
| `@openzeppelin/relayer-plugin-channels` | 0.21.0 | `npm view` |
| Next.js latest | 16.4.0 (Sown pins 15.x to copy Scrip's components) | `npm view` |

## 3. Assets on Stellar mainnet

| Asset | Issuer / contract | Facts read | Source |
| --- | --- | --- | --- |
| **USDC** (Circle) | `USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`; SAC `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` | 2,481,883 trustlines; price 0.999416 | https://api.stellar.expert/explorer/public/asset/USDC-GA5Z… |
| **USDY** (Ondo) | `USDY-GAJMPX5NBOG6TQFPQGRABJEEB2YE7RFRLUKJDZAZGAD5GFX4J7TADAZ6`; SAC `CB3YA656OYIHU57657I5KGSBRHE5I3OZU4VFC22PYAOANFZHEWNYGAGP` | issuer flags `auth_required: false`, `auth_revocable: true`, `auth_immutable: false`, `auth_clawback_enabled: true`; home domain ondo.finance; supply 467,502,127.77 USDY; 431,380 trades; 40,682 payments; 3,159 trustlines (731 funded); price $1.139591; created 2025-08-28; TOML description "USDY is a tokenized form of US Yield Bearing Bank Deposits… the price of USDY will appreciate as yield is accrued" | `GET https://horizon.stellar.org/accounts/GAJMPX…` · https://api.stellar.expert/explorer/public/asset/USDY-GAJMPX… |
| USDY, Ondo's own words | "backed by short-term U.S. Treasuries and bank demand deposits", "accrues yield daily", for "global (non-US) individual and institutional investors", "permissionless" on Stellar; integrations LOBSTR, Aquarius, Meru, Soroswap, Decaf; published 2025-09-17 | https://ondo.finance/blog/usdy-is-now-live-on-stellar | read |
| USDY: KYC at primary mint with a 40–50 day lockup; open secondary transfers; US persons excluded by terms | DefiLlama/eco explainers via search; not Ondo's page | search summary; **cite Ondo's terms on the surface, not these** |
| **USTRY** (Etherfuse, US Treasury notes) | `USTRY-GCRYUGD5NVARGXT56XEZI5CIFCQETYHAPQQTHO2O3IQZTHDH4LATMYWC`; SAC `CBLV4ATSIWU67CFSQU2NVRKINQIKUZ2ODSZBUJTJ43VJVRSBTZYOPNUR` | issuer flags `auth_required: false`, `auth_revocable: true`, `auth_clawback_enabled: true`; home domain etherfuse.com; 945 trustlines (289 funded); 51,479 payments; price $1.075909 | Horizon account; stellar.expert |
| **CETES** (Etherfuse, Mexican T-bills) | `CETES-GCRYUGD5…MYWC` (same issuer); SAC `CAL6ER2TI6CTRAY6BFXWNWA7WTYXUXTQCHUBCIBU5O6KM3HJFG6Z6VXV` | 1,181 trustlines (392 funded); 212,216 payments; price $0.065732 | stellar.expert |
| Etherfuse Stablebonds: 1:1 backed tokens tracking short-term sovereign debt, NAV accrues; primary eligibility non-US; Swiss DLT Act registration; most CETES/USTRY market cap on Stellar (~$4.7M / ~$11.2M on DefiLlama, undated) | https://defillama.com/rwa/asset/cetes · https://defillama.com/rwa/asset/ustry · https://etherfuse.substack.com/p/your-guide-to-accessing-stablebonds | search summaries; docs.etherfuse.com is an API index with no token facts |
| **MGUSD** (MoneyGram, issued by Bridge) | `MGUSD-GAIUGZZZSL47BKH27SUDZESZELFJDPE2UM52RACOSFJ7BIVBGKUEJSUZ`, domain mgusd.moneygram.com | 422 trustlines, **22 authorised**, 8 funded, 51 payments → permissioned to MoneyGram's wallets; cannot be Sown's cash leg | stellar.expert search |
| MGUSD launch: 2 June 2026, Bridge (Stripe) as issuer, M0 contracts, Fireblocks custody before distribution, US first, self-custodial wallet in the MoneyGram app; cash-out at agents described inconsistently across coverage | https://www.theblock.co/post/403320/moneygram-debuts-mgusd-stablecoin-on-stellar-for-its-global-payments-network and others via search | search summary |
| **BENJI** (Franklin Templeton) | `BENJI-GBHNGLLIE3KWGKCHIKMHJ5HVZHYIK7WTBE4QF5PLAKL4CJGSEU7HZIW5` | 2,382 trustlines, 1,377 authorised → auth-required | stellar.expert search |
| WTGXX (WisdomTree), YLDS (Figure) | listed; small or permissioned (YLDS 325 trustlines, 9 authorised) | stellar.expert search |
| **Testnet USDC** (Circle) | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, home domain centre.io, `auth_required: false`, clawback off; also listed by SDF's test anchor | Horizon testnet; testanchor TOML |
| **XLM SAC** mainnet | `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA` | stellar.expert |

## 4. Liquidity, read on the day

### SDEX (classic order books), Horizon `/paths/strict-send`

| Route | Result | Source |
| --- | --- | --- |
| 10 USDC → USDY | 8.7708803 USDY, direct (no hops) | `horizon.stellar.org/paths/strict-send?…` |
| 1 USDC → USDY | 0.8770880 USDY | same |
| 500 USDC → USDY | 436.5008449 USDY, direct | same |
| 100 XLM → USDY | 17.4474624 via USDC, or 17.3132449 direct | same |
| 10 USDC → USTRY | 9.2876458 USTRY, direct | same |
| 10 USDC → CETES | 152.0050608 CETES, direct | same |
| USDC/USDY order book | best bid 0.8770880 (11.9 USDY), asks from 0.8842656 with 570.8 USDY then 400 then 535.6 | `horizon.stellar.org/order_book?…` |
| Classic liquidity pools containing USDY | only dust pools against unrelated tokens (largest 32.9 USDY) | `horizon.stellar.org/liquidity_pools?reserves=USDY…` |

### Aquarius AMM (Soroban), `https://amm-api.aqua.network/pools/`

Liquidity figures are the API's `liquidity_usd` divided by 10⁷.

| Pool | Address | Type, fee | Tokens (sorted order = indices) | Reserves | Liquidity |
| --- | --- | --- | --- | --- | --- |
| **USDY/USDC** | `CAFHLHGZXOVNCGFJ7DOXL7JDNMBCEZKDI3LS5NRQH3GXC7CSIMQZHUSM` | constant product, 0.10% | [0] USDY `CB3YA656…GAGP`, [1] USDC `CCW67TSZ…MI75` | 893,905.50 USDY / 1,013,371.94 USDC | ≈ $2,015,612 |
| **USTRY/USDC** | `CCX2TYR4AQTPPMTZOIMP3YIBHAYLLSTXVP47PAGTL753PCQFSKV32MIA` | constant product, 0.30% | [0] USTRY `CBLV4ATS…PNUR`, [1] USDC | 1,018,726.88 USTRY / 1,095,689.99 USDC | ≈ $2,178,550 |
| **CETES/USDC** | `CCKGQSQG5JLZBMYMB4HT6M4H7FUC3NK5C75MIHN6627LRAY5B2SYL2AD` | constant product, 0.10% | [0] CETES `CAL6ER2T…6VXV`, [1] USDC | 17,685,067.53 CETES / 1,163,145.63 USDC | ≈ $2,309,488 |
| XLM/USDC | address begins `CA6PUJLBYK` (look up the full id on the API) | constant product | native, USDC | — | ≈ $3,583,970 |
| PYUSD/USDC | `CDMH535JSD…` | stable | — | — | ≈ $7,993,108 |
| USDY/USDC (concentrated) | `CCV2X5THRWCT7HCGJU42DMOVYLAARVIPEDG2LQOVVA2WGONF2MZY2OX6` | concentrated, 0.10% | — | — | ≈ $13,600 |
| Testnet USDC/native | `CAYBMZYJCOMM…` (testnet API) | constant product | — | — | ≈ $1,294,488 (test value) |

| Claim | Source |
| --- | --- |
| Router mainnet `CBQDHNBFBZYE4MKPWBSJOPIYLW4SFSXAXUTSXJN76GNKYVYPCKWC6QUK`; router testnet `CBCFTQSPDBAIZ6R6PJQKSQWKNKWH2QIV3I4J72SHWBIK3ADRRAM5A6GD`; testnet assets issuer `GAHPYWLK6YRN7CVYZOO4H3VDRZ7PVF5UJGLZCSPAEIKJE2XSWF5LAGER`; backend API `https://amm-api.aqua.network/api/external/v2` (the `/pools/` route also answers); fee-collector factory `CA4Q2T6FRAFYJYSMDJV7F6B7RL5PS6QS2UOZHBMCT2KSMGQRAAKP2MKO` | https://docs.aqua.network/developers/reference/addresses-and-networks.md |
| Router: `get_pools(tokens) -> Map<BytesN<32>, Address>`, `swap_chained(user, swaps_chain, token_in, in_amount, out_min) -> u128` (≤ 4 pools), `swap_chained_strict_receive(…)` (≤ 3). Pool: `estimate_swap(in_idx, out_idx, in_amount) -> u128` (via simulation), `swap(user, in_idx, out_idx, in_amount, out_min) -> u128`, `estimate_swap_strict_receive`, `swap_strict_receive(user, in_idx, out_idx, out_amount, in_max)`. "Pool contracts can be called directly for contract sub-invocations, since a direct call uses fewer resources" | https://docs.aqua.network/developers/reference/router-and-pool-contracts.md |
| Contract-level flow: simulate `estimate_swap`, min out = estimate × (100 − slippage)/100 floored, build `swap`; the SDK (`@aquariusdefi/sdk`, `pools.forPair`, `pool.quote`, `pool.execute`) wraps it; integrator provider fees exist via a fee collector | https://docs.aqua.network/developers/code-examples/executing-swaps-through-specific-pool.md · https://docs.aqua.network/developers/code-examples/add-fees-to-swap.md |

## 5. Tokenized stocks, RWAs, DTCC

| Claim | Source | Status |
| --- | --- | --- |
| DTCC and SDF plan to enable tokenization of DTC-custodied assets on Stellar, expected in the **first half of 2027**; interim evaluation of Russell 1000 constituents, major-index ETFs and US Treasury bills/bonds/notes; "same investor protections, entitlements and safeguards as traditionally held securities"; SEC no-action letter to DTC in December 2025. The release text does not mention clawback, transfer restrictions or identity controls | https://www.dtcc.com/news/2026/may/27/tokenization-service-to-connect-with-stellar-public-blockchain-as-dtc-advances-multi-chain-strategy (27 May 2026) | read |
| "DTC remaining the record", clawback/identity controls | https://www.coindesk.com/business/2026/05/27/dtcc-plans-to-bring-tokenized-assets-to-stellar-in-latest-wall-street-blockchain-push | founder-supplied; not in the DTCC text I read |
| Stellar tokenized RWA value $3.996B on 29 Aug 2026, from $868.8M at end-2025 (~360%); Spiko $1.55B, Realiz $559M, Tradable $548M, Franklin Templeton $546M, Ondo $535M (27 Aug); data from a Stellar-maintained Dune dashboard; non-US government debt ≈ $490M (RWA.xyz, 20 Aug); **no equity category reported** | https://cointelegraph.com/markets/stellar-tokenized-rwa-market-nears-4b-after-fourfold-2026-growth | read |
| Tokenized public equities on Stellar ≈ $22.9M (RWA.xyz, Dec 2025) | founder-supplied | unverified; no live equity issuer found on 2026-10-08 |
| No tokenized stocks trading on Stellar as of 2026-10-08; xStocks not on Stellar; Ondo Global Markets not confirmed on Stellar | web search (several queries) | absence of evidence, stated as such |
| USDY/USD SEP-40 price feed on Stellar by RedStone, 5 Aug 2026; address not in the post | https://www.redstone.finance/blog/redstone-brings-ondos-usdy-to-stellar-defi-with-sep-40-integration/ | read; **address to be found in RedStone docs if the receipt wants an oracle line** |

## 6. Smart accounts, passkeys, fee sponsorship

| Claim | Source |
| --- | --- |
| Smart Account Kit: TypeScript SDK for OpenZeppelin smart-account contracts with WebAuthn passkeys; signers: passkey (External, WebAuthn verifier), Ed25519 (External), Delegated G-address; policies as separate contracts (threshold, weighted threshold, spending limit); `createWallet(app, user, { autoSubmit })`; `kit.execute(contract, fn, args)` + `signAndSubmitAdmin`; `connectWallet({ prompt / fresh / credentialId / contractId })`; discovery via `discoverContractsByCredential`; storage `IndexedDBStorage`; "Unaudited integration software" | https://raw.githubusercontent.com/stellar/smart-account-kit/main/README.md |
| Fee sponsorship: set `relayerUrl`; the SDK posts `{ func, auth }`; with `autoSubmit: false` the app submits `relayerPayload { func, auth }` through a funded source it controls; `deployerSecret` for a dedicated deployer; never fund the shared deployer | same README; https://raw.githubusercontent.com/stellar/smart-account-kit/main/docs/mainnet-hardening.md |
| Relayer proxy reference (Cloudflare Worker): `POST /` with `{func, auth}` (invocations, transfers, one `createContractV2` with a WebAuthn signer) or `{xdr}` (dedicated-deployer deploy); validates shapes and fee ceilings; forwards to OpenZeppelin Channels; mints a Channels key per client IP via `/gen` | https://raw.githubusercontent.com/stellar/smart-account-kit/main/relayer-proxy/README.md |
| Deployments (Protocol 27, 2026-07-09): account WASM `1b5f4534a76322da2ad7c745f6900857a6802b0ca79850c35a03561df997785a` on both networks. **Testnet**: WebAuthn verifier `CC7EKIHQP3TN4CARQDND6CEOY2UXLWWC2X5GHTD5NLAT7BG5GPZIOM3F`, Ed25519 verifier `CAAVTMCBXEIBPR64EAASKFXERVPYFZA2JYP5A3BG6PESWEFUJX5IHKN4`, threshold `CB3FATQKCIRIQOCYRUPCQ2KREQ7T4RPKS7EAEOZWPEPUKWEDRVROBCEG`, weighted `CCMZ6X4KM3RC7HXWCZDTH7CMWIJXFPN6HLGKJBM63MCOW2AJ2V5W7YXY`, spending-limit `CABXBYJNZ7IUW4G3D6BND5YCAQF3ASSDMDAOKQQ63UYFSO7WUU2TIP5G`. **Mainnet**: WebAuthn `CB7HENHJ7NF34I5FFXQK7D5I3WWQRGB5O5XO77D3NXMT7LM7LOKRQ5YR`, Ed25519 `CBOOZV2BK5OETGL4Q4KGEBESPRLJFN7DOFWDT7OZGLD7EQEZUVOWUEMC`, threshold `CCEJBH26V7REDWKKAV5TYF3M7NF2OZBELBK2DZTVX3BRNEPVCOAZXJUF`, weighted `CDY6CPMPVGQ6GI5UG4BK2HHTQF5ASFYTV23CLFUZJB43DSKZVD5HN4UT`, spending-limit `CBCGTERZ6W2M6SMKVKQDTNKWFQXEPXEQO6ZCEKNZHT3QMA4X7Z2IYUS4`. Deployer `GAAH4OT36RRCCAGKARGPN2HLHT2NOBVFHO4GUHA6CF7UKQ4MMV24WQ4N` (sign-only; never fund). The browser WebAuthn smoke test was run on testnet only | https://raw.githubusercontent.com/stellar/smart-account-kit/main/docs/deployments-protocol-27-2026-07-09.md |
| Security model and integration rules: the deployer never signs the account; treat derived addresses and discovery as untrusted; register a new credential per network; fresh-device recovery only through the primary passkey; `connectWithCredentials` verifies birth, current code and the live signer | https://raw.githubusercontent.com/stellar/smart-account-kit/main/docs/security-deterministic-deployer.md |
| 0.8.0 changes: requires SDK ^16.3.0 and wallets-kit <2.6.0; WebAuthn user verification required; admin signing methods; relayer must return explicit success and a 32-byte hash | https://raw.githubusercontent.com/stellar/smart-account-kit/main/CHANGELOG.md |
| Mercury indexer, hosted: testnet `https://testnet.mercurydata.app/rest/smart-account-indexer`, mainnet `https://mainnet.mercurydata.app/rest/smart-account-indexer`; public read routes `/api/lookup/:credentialId`, `/api/lookup/address/:address`, `/api/contract/:contractId`; schema 2 served on both networks on 2026-09-08 | https://raw.githubusercontent.com/stellar/smart-account-kit/main/indexer/README.md |
| Demo app: Vite + React; env `VITE_RELAYER_URL`, `VITE_INDEXER_URL`; flows: create, connect, discovery, rules, signers, policies, transfer, upgrade; headless WebAuthn via `pnpm agent-browser:webauthn` | https://raw.githubusercontent.com/stellar/smart-account-kit/main/demo/README.md |
| OpenZeppelin smart account: signers (Delegated, External via verifier contracts), context rules (scope, lifetime, signers, policies), policies as external contracts; `Policy` trait `enforce / install / uninstall`; at most 5 policies per rule; examples: simple threshold, weighted threshold, spending limit (limit + window seconds, rolling reset); **no schedule policy shipped** | https://docs.openzeppelin.com/stellar-contracts/accounts/smart-account · https://docs.openzeppelin.com/stellar-contracts/accounts/policies |
| OpenZeppelin Relayer on Stellar; **Stellar Channels** hosted service: mainnet `https://channels.openzeppelin.com`, testnet `/testnet`; keys at `/gen` and `/testnet/gen`; `submitSorobanTransaction({func, auth})`, `submitTransaction({xdr})`; a per-key fee limit in stroops (amount unspecified) resetting 24 h after the first transaction, `FEE_LIMIT_EXCEEDED`; fair-use; the page documents unreleased features and points to v1.5.x stable docs; Launchtube discontinued | https://developers.stellar.org/docs/tools/openzeppelin-relayer · https://docs.openzeppelin.com/relayer/guides/stellar-channels-guide |
| Fee-bump transactions can wrap Soroban transactions (used by Fermah Pay and OpenZeppelin Relayer; the January 2024 refund bug was fixed before Protocol 20 mainnet) | https://docs.fermah.xyz/fermah-pay/authorising-and-submitting · https://stellar.org/blog/developers/fee-bump-bug-disclosure | search summary |

## 7. Stellar primitives used or deliberately not used

| Claim | Source |
| --- | --- |
| Claimable balances: create / claim / clawback; predicates unconditional, before_absolute_time, before_relative_time, not, and, or; each claimant adds one base reserve to the creator; the claimant must have an authorised trustline (`op_no_trust` / `NOT_AUTHORIZED`); up to **10 claimants**; the reserve returns to the creator on claim; the page's example loads the claimant's account, i.e. the claimant is a classic account | https://developers.stellar.org/docs/build/guides/transactions/claimable-balances · https://github.com/stellar/stellar-protocol/blob/master/core/cap-0023.md |
| Path payments: strict send / strict receive through order books and liquidity pools; `destMin` guards the fill; several hops possible | https://developers.stellar.org/docs/build/guides/transactions/path-payments |
| Sponsored reserves (CAP-33): begin/end sandwich, both sign, account creation with 0 XLM starting balance, trustlines, claimable balances, offers, data, signers; revoke/transfer sponsorship; "the creator gets the base reserve back" when a claimable balance is claimed | https://developers.stellar.org/docs/build/guides/transactions/sponsored-reserves |
| Fee bumps (CAP-15): inner envelope keeps its signatures and sequence; outer fee account signs; fee ≥ inner fee and ≥ network minimum for ops + 1; 10× for replace-by-fee | https://developers.stellar.org/docs/build/guides/transactions/fee-bump-transactions |
| SAC: G-address balances live in trustlines and need `AUTHORIZED_FLAG`; **contract addresses need no trustline** (balance in contract data, i128); if the issuer sets `AUTH_REQUIRED` the admin must authorise the contract address; `trust(addr)` (Protocol 26) lets a contract create a G-address trustline; SEP-41 interface `approve(from, spender, amount, live_until_ledger)`, `transfer`, `transfer_from`, `balance`; admin `set_admin`, `set_authorized`, `clawback`, `mint`; the SAC address is deterministic from the asset | https://developers.stellar.org/docs/tokens/stellar-asset-contract |
| Authorization: `require_auth` for accounts (multisig, medium threshold), transaction invoker (signature inferred from the source account), **contract invoker (the direct invoker contract is authorised; deeper calls are not)**, contract accounts (`__check_auth`); one authorisation tree per signature; nonces; expiration | https://developers.stellar.org/docs/learn/fundamentals/contract-development/authorization |
| State archival: temporary / persistent / instance; persistent entries archive at TTL 0 and are restorable (automatic restore since Protocol 23); `extend_ttl(N)`; max TTL is a network parameter (`max_ttl()`), minimum after restore `current + 4095` | https://developers.stellar.org/docs/learn/fundamentals/contract-development/storage/state-archival |
| RPC `getTransactions`: returns envelope, result, result meta, events; pagination within "the history retention of their corresponding RPC provider" (no figure given) | https://developers.stellar.org/docs/data/apis/rpc/api-reference/methods/getTransactions |
| Horizon transaction object: `result_meta_xdr` marked for removal from SDF-hosted Horizon; use RPC for meta | https://developers.stellar.org/docs/data/apis/horizon/api-reference/resources/transactions/object |

## 8. Wallets

| Claim | Source |
| --- | --- |
| Stellar Wallets Kit supports xBull (PWA/extension), Albedo, Freighter (extension and mobile), Rabet, WalletConnect, LOBSTR, Hana, Hot Wallet, Klever, OneKey, Bitget; `StellarWalletsKit.init({ modules })`, `getAddress()`, `signTransaction(xdr, { networkPassphrase, address })` | https://raw.githubusercontent.com/Creit-Tech/Stellar-Wallets-Kit/main/README.md |
| Umbra used the Wallets Kit (Freighter, xBull, Albedo, LOBSTR) and noted Freighter refuses plain `http://localhost` | `/Users/macbookair/projects/Umbra/README.md` |
| Whether Freighter or LOBSTR show and claim claimable balances in-app | not found | unknown; irrelevant to v1 (the envelope replaces claimable balances) |

## 9. Anchors and cash

| Claim | Source |
| --- | --- |
| SDF test anchor `testanchor.stellar.org`: SEP-10 auth, SEP-12 KYC, SEP-6, SEP-24, SEP-31, SEP-38, and **SEP-45 web auth for contracts** (`WEB_AUTH_CONTRACT_ID CD3LA6RKF5D2FN2R2L57MWXLBRSEWWENE74YBEFZSSGNJRJGICFGQXMX`); assets SRT, testnet USDC, native; testnet only | https://testanchor.stellar.org/.well-known/stellar.toml |
| Anchors are on/off-ramps; SEP-24 hosted deposit/withdrawal in the anchor's webview; SEP-6 programmatic; directory at anchors.stellar.org | https://developers.stellar.org/docs/learn/fundamentals/anchors |
| MoneyGram Ramps (page marked deprecated): SEP-10 + SEP-24; USDC on Stellar; off-ramps in 174 countries; requires an allowlisted wallet domain (ramps@moneygram.com), testnet sandbox, a self-registered MainNet "Production Preview" capped at 10–20 USDC per transaction and 100 USDC aggregate; production needs certification, KYB and agreements; limits on-ramp 5–950 USDC, off-ramp 5–2,500 USDC; the user gets a reference number to pick up cash | https://developer.moneygram.com/moneygram-developer/docs/moneygram-ramps |
| Vesseo (ex-Vibrant): built by Sunship (SDF); self-custodial USDC; MoneyGram cash-in at e.g. CVS; SEP-24 bank connections; +282% MAU Q2 2023→Q2 2024, 93% Argentina; yield "not guaranteed"; ~300k users across 16 LatAm countries (Spanish article, undated) | https://stellar.org/case-studies/vibrant and search summary |
| Beans: fee bumps and sponsored reserves so users pay no fees; MoneyGram cash in/out; Stellar Disbursement Platform | https://communityfund.stellar.org/project/beans-app |
| Decaf: Stellar + Solana; WhatsApp payment links; MoneyGram access in 180+ countries; i Awards 2025 | https://stellar.org/case-studies/decaf |

## 10. Competitors and prior art (details in `IDEA.md`)

| Project | What I read |
| --- | --- |
| RemitStream | recipient-side rule; `AutoSplitRouter` + `SavingsVault` + `rUSDC` test token; testnet at remit-stream.vercel.app; no yield source; 44 commits, 43 contract tests, a demo video; 0 stars — https://github.com/Anuoluwapo25/remitStream |
| CircleUp | ROSCA on Soroban; factory/circle/reputation contracts; Soroban SDK 21; placeholders; fork of `CIRCLEUP-AJO/CIRCLEUP`; 20+ forks seen — https://github.com/arcphlamez/CIRCLEUP |
| SendIN (SCF) | passkeys, US→India, 2025 plan — https://communityfund.stellar.org/project/recyBlX10TRElhbGN |
| SwiftSend (HackQuest) | onboarding prototype, simulated transfers — https://hackquest.io/en/projects/Code-Africa-Hackathon-20-SwiftSend |
| Veil | open-source passkey smart wallet on Soroban — https://github.com/viccoder-oops/veil |
| Scrip (founder) | `/Users/macbookair/projects/webgold/CLAUDE.md`, `docs/SCRIP-SAVE-PLAN.md`, the `scrip-ui` skill, `src/components/stub/`, `src/components/save/`, `src/components/start/`, `src/app/receipt/[sig]/page.tsx` |

## 11. Market and behaviour

| Claim | Source | Status |
| --- | --- | --- |
| Remittances to low- and middle-income countries: **$728.6 billion in 2025**, nearly double a decade earlier (IFAD, *Sending Money Home 2026*, mid-September 2026) | https://www.wam.ae/en/article/c29ci7w-migrants-sent-7286-billion-home-families-low-and · https://jamaica-gleaner.com/article/news/20260916/remittances-developing-countries-near-us730-billion-un | read via search; the IFAD PDF itself not opened |
| South Africa stokvels: 11M+ members, ~R50B a year (NASASA 2025); 41% of Kenyans used chamas (FSD Kenya 2018) | founder-supplied | unverified; not used on any surface |

## 12. Open questions (resolve on Day 0, see `BUILD-PLAN.md`)

1. Exactly how an Aquarius pool pulls the input token from `user` when `user` is a contract (`transfer` vs `transfer_from`): decides the `authorize_as_current_contract` entry. Read it off a testnet simulation.
2. Whether `smart-account-kit@0.8.0` with `@stellar/stellar-sdk@16.3.1` creates and operates a wallet on **Protocol 29** testnet without XDR errors (its deployments were verified under Protocol 27). The Day-0 smoke test answers it.
3. Whether OpenZeppelin Channels mainnet keys carry a usable fee limit for a demo. Not needed: Sown's own sponsor account pays on mainnet.
4. The RedStone USDY/USD feed address, if the receipt is to show a "vs oracle" line. Optional.
5. The hackathon's submission form fields and cutoff time. The founder must read them on the platform.

## 13. Day 0, measured (2026-10-08, by the build agent)

Every figure here was produced by a script in this repository and can be re-run.

### Smoke 1 — the Smart Account Kit 0.8.0 with stellar-sdk 16.3.1 on Protocol 29 (`scripts/smoke/kit-testnet.ts`)

| Step | Result |
| --- | --- |
| `createWallet` with a software P-256 passkey, deploy posted as `{ func, auth }` to an in-process relay that pays with Sown's testnet sponsor | landed in 8.8 s, wallet `CDBTEAVSV6F2XWDVWZ4IYOERAZHXDYUXXOALXTRFZOKLMVRF7A5JSCPY`, tx `e02290cbb468639345e5b7b3071707f002bca9da09f2325a2cee3867078db5c6` |
| sponsor funds the wallet with 5 XLM | tx `4f655b4a209e55cf1078ce7d12d7d963508055aeab38befb6e881fa7a997d935` |
| `kit.transfer(XLM, G…, 1)` signed by the passkey, submitted by the relay | landed in 10.0 s, tx `82e48f0ec931eeedfcbd6fc49b93b912465c9a8a003b636b360b4cffaae91777`; the recipient's balance moved by exactly 1 XLM |
| passkey prompts | 2 (one registration, one assertion); no XDR or auth error |

**Verdict: the kit works on Protocol 29. Passkeys are not a cut candidate.** The deploy the kit
builds (decoded from the transaction above): `CreateContractV2` from the shared deployer
`GAAH4OT…WQ4N`, account wasm `1b5f4534…785a`, constructor args `[[External(CC7EKIHQ…OM3F,
65-byte P-256 key ‖ credential id)], {}]`, one auth entry by the deployer for that same creation.
`src/lib/relay/inspect.ts` accepts exactly that and nothing else.

### Smoke 2 — Aquarius from a G-account, and the auth tree (`scripts/smoke/aquarius-testnet.ts`)

Testnet's USDC/XLM pool is `CD3LFMMLBQ6RBJUD3Z2LFDFE6544WDRMWHEZYPI5YDVESYRSO2TT32BX`
(constant product, 0.30%, tokens `[0] USDC CAZRY5GS…6LF5` (Aquarius's test USDC, issuer
`GAHPYWLK…LAGER`), `[1] XLM CDLZFC3S…CYSC`). Circle's testnet USDC has no Aquarius pool against
XLM, so Sown's testnet runs on Aquarius's test USDC.

| Step | Result |
| --- | --- |
| trustline to `USDC:GAHPYWLK…` | `cf16e21969dd3d5ae0916879984cefc50247566167ec9f73290052d117d42ac5` |
| 3,000 XLM → 33.96 USDC | `97d726ae4939ca9b9ab39cce738b48dff1ec0ddc3e24db1b69d1ff250fb022f7` |
| `estimate_swap(0, 1, 1 USDC)` | 89.7003417 XLM |
| 1 USDC → 89.7003417 XLM (min 88.8033382) | `7aa466e69696f28196c91cafac4d0194f4de8ef317cc0b1f1656beeef56046fb` |

The auth tree the simulation records for `swap(user = G-account, 0, 1, 10000000, 888033382)`:

```text
CD3LFMML….swap(user, 0, 1, 10000000, 888033382)        credentials: source account
  CAZRY5GS….transfer(user, CD3LFMML…, 10000000)
```

**The pool pulls with `transfer(user, pool, in_amount)`, not `transfer_from`.** So when `user`
is the Sown contract, `swap`'s own `user.require_auth()` is satisfied by direct invocation and
the contract pre-authorises exactly `usdc.transfer(contract, pool, keep_in)` with
`authorize_as_current_contract` (the comment at the top of `contracts/sown/src/lib.rs`). The
testnet battery's sends confirm it on chain.

**Instruction headroom is required.** The first USDC→XLM swap was simulated at 3,377,838
instructions and spent 3,378,198 on the ledger seconds later: `invokeHostFunctionResourceLimitExceeded`
(tx `6bc95adad78caa31989192f24c8f472cbaade7714d5b08a5641a2b3f961d1727`). Every Sown simulation
that will be submitted now asks the RPC for 1,000,000 extra instructions (`INSTRUCTION_LEEWAY`),
about 2,500 stroops.

### Smoke 3 — the three mainnet pools by simulation (`scripts/smoke/mainnet-pools.ts`)

Mainnet ledger 64,833,322, protocol 29, 2026-10-08 09:40 UTC. In all three pools USDC is index 1
and the keep asset index 0, so `set_asset(asset, pool, 1, 0, true)`.

| Pool | Type, fee | Reserves | 1 USDC → | 10 USDC → | 100 USDC → | Implied price |
| --- | --- | --- | --- | --- | --- | --- |
| USDY/USDC `CAFHLHGZ…HUSM` | constant product, 0.10% | 893,905.50 USDY / 1,013,371.94 USDC | 0.8812270 USDY | 8.8121918 | 88.1141007 | $1.134781 → $1.134892 |
| USTRY/USDC `CCX2TYR4…2MIA` | constant product, 0.30% | 1,018,726.88 USTRY / 1,095,689.99 USDC | 0.9269681 USTRY | 9.2696060 | 92.6884700 | $1.078786 → $1.078883 |
| CETES/USDC `CCKGQSQG…L2AD` | constant product, 0.10% | 17,685,067.53 CETES / 1,163,145.63 USDC | 15.1892994 CETES | 151.8918206 | 1,518.8008056 | $0.065836 → $0.065841 |

### What a send and a claim cost (`deployments/testnet-battery.json`, `scripts/lib/rent.ts`, `npm run preflight`)

| Transaction | Fee charged (testnet) | Of which rent |
| --- | --- | --- |
| a send (swap + envelope extended to the maximum TTL, 3,110,400 ledgers ≈ 180 days) | 1.1182866 XLM | 1.1136982 XLM |
| a claim into a classic wallet | 0.0651671 XLM | 0.0624270 XLM |
| a passkey wallet's deployment | 0.0562426 XLM | 0.0533757 XLM |
| a claim into a passkey wallet | 0.1654315 XLM | 0.1627876 XLM |
| a refund by the sender | 0.0086224 XLM | 0.0059066 XLM |

Rent is the cost, compute is not (a send's non-refundable fee is 0.004 XLM). The rate depends on
each network's live Soroban state size: testnet holds 3.356 GB of a 4.0 GB target (5,651 stroops
per KB, ≈ 0.0080 XLM per KB per day); **mainnet holds 1.855 GB of a 3.0 GB target and sits at the
floor (1,000 stroops per KB, ≈ 0.00142 XLM per KB per day)**. Mainnet also forces at least 120
days (2,073,600 ledgers) on any new persistent entry. So a mainnet send's envelope (~0.77 KB)
costs about 0.13 XLM of rent for the forced 120 days and about 0.20 XLM at the maximum the spec
asks for; the confirm sheet shows the simulated fee, never the design's "about $0.001".

### Contract code is rented on its in-memory size (`npm run preflight`, 8 October)

| Measurement | Result |
| --- | --- |
| testnet upload of the 15 KB wasm, which gives the code entry testnet's 7-day minimum | rent charged 6.25 XLM (tx `d26dd784…`), about 7× what 15,472 bytes at testnet's rate would cost: code rent uses the compiled module's size |
| the first constructor's `extend_ttl(max/2, max)` on the instance, which also extends the code, to 180 days | rent charged **154.9 XLM** on testnet (tx `ea695225…`) |
| the same upload, simulated on mainnet (rent 1,000 stroops per KB, the floor; new entries live at least 120 days) | **21.58 XLM**, about $4.15 at Aquarius's XLM price |
| one Face ID wallet's deployment, simulated on mainnet | 0.198 XLM |
| keeping instance and code alive, from testnet's own `ExtendFootprintTTL` (tx `3a6516a0…`, 7 → 60 days, 56.4 test XLM) at mainnet's rate | about 4.7 XLM per 30 days (4.83 on 9 October, rent 1,022 stroops per KB with 2.00 GB live) |
| the same upload, simulated again on 9 October | 22.08 XLM: the rent rate rises with the live state's size |

Rent per entry, as soroban-env-host computes it: the extension at the new size, plus any growth in
size over the life already paid for (a claim grows the envelope by 44 bytes with about 180 days
left, which is nearly all of a claim's rent). Modelled that way, the battery's send, claims and
refund match the rent testnet charged within 0.1–4.2%; repriced at mainnet's rate: a send about
0.21 XLM (0.28 for the first send on a new contract, which also opens the contract's USDC and keep
balances), a claim into a Face ID wallet about 0.09 XLM, into a classic wallet about 0.014 XLM.
