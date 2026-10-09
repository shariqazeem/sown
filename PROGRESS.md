# Progress

> Kept by the build agent. Every "works" line names the transaction that proves it; each hash
> opens on `https://stellar.expert/explorer/testnet/tx/<hash>`. Last updated Fri 9 Oct 2026,
> 16:00 PKT (11:00 UTC).

## 9 Oct, afternoon: Sown's own design, the note, the QR

The founder read the first build and asked for a product that looks like its own, premium and
usable by anyone, after an assessment of the field (47 submissions on the platform; the deadline
confirmed as **13 Oct 04:59 PKT = 12 Oct 23:59 UTC**; verdict: keep the idea, do not pivot to
stocks that do not exist on Stellar yet, fix the face and get on mainnet).

- **The design system is Sown's** (`docs/DESIGN.md`, `src/styles/tokens.css`): evergreen, sand,
  gold for the part that stays; Instrument Serif, Manrope, DM Mono. Every page re-skinned; the
  front door, the send card, the claim page, the receipt's link sheet and the share images redrawn.
- **The split**, drawn live on the send card from the pool's quote, is the product's one picture.
- **A name and a note** ride in the link after the secret; the send seals their sha256 as the
  envelope's memo (the field existed, always zero until now); the claim page shows them only when
  the ledger's memo matches (`src/lib/envelope/note.ts`, 6 tests).
- **A QR code** on the receipt's link sheet, for the phone in the room.
- **"Try it with a test wallet"** on the card itself (testnet): one tap, the wallet funds itself.
- **Proven in a browser on testnet, envelope 10** (`CCKMIXT4…HQSB`): $5 keeping 10% from the test
  wallet `GA2V…VEDU` with the name "Shariq" and the note "For school fees, with love", send
  `a0acc0442ca2300a8d5d6ed2f0ffd06929d32b76e3fa8dd0c552acc378f731be` (ledger 5,103,521, memo
  `aef71881…eeb684`); the receipt showed the seal and the QR; the claim page showed "Shariq sent
  you · PKR 1,385 · "For school fees, with love""; claimed into the same test wallet through the
  relay, `a11714a36d0b06c5a77221f70a83ff06bacd351a34e5f1ae1b4d6f97c090c269` (ledger 5,103,551).
- **Envelope 11 on the live site, claimed with a Face ID wallet, on film**: sent from the live
  site's test wallet with the note "For Ammi. School fees, with love" from "Shariq", then claimed
  by the film recorder through a real WebAuthn ceremony (a virtual platform authenticator) into
  wallet `CCSEA6N5DOB5QAXB7UF32ATS3RO32AW6PWI3TD2DFXURTZL7EM33NF7I`, deployed and submitted by
  Sown's servers: claim `11acafdbecab8c1140df7f90e0c7709d33ef87344909689e0b19d6dad37660bc`,
  21 seconds from the tap to "Stays yours · in your wallet" on screen.
- **Envelope 12, claimed by the founder on a MacBook with Touch ID** (10 Oct, 21:55 UTC on the
  9th): a real passkey on a real device, on the live testnet site, into wallet
  `CCBJLUHHFEVWVE7WOHBJWV7FZ5WLZXUI6GDP3IFVYJLXQC5NSKFVQP6D`; send
  `22d4da43464571f07aaab9cc783f43ddeb08a047deb14cf80cda9eeaa4d1b751`, claim
  `bb43a1f175d17dd515dd689c6578da5306df9e0432872d36780c0debd986077e` (ledger 5,111,868). The
  gift read "Shariq sent you · PKR 1,385 · "A real-phone test. Keep it or send it back."", then
  "Claimed on Stellar, just now · Stays yours · in your wallet", with "Your wallet" in the nav.
- **The film, draft 2** (`../sown-video/out/pitch.mp4`, 110 s): recorded from the live site in
  the new design; the claim scene is that real claim. The founder's two takes (R1, P1 on mainnet)
  still replace scenes 2 and 3 when they exist (`docs/DEMO-AND-PITCH.md`).
- **The README** carries the send card as a GIF (`docs/sown-send.gif`).
- Lint, typecheck and the offline suite green: 137 tests (was 128).

## Live for testing (9 Oct)

**https://sown.80.225.209.190.sslip.io** — the testnet app on the founder's VM (pm2 `sown` on
:3400 behind nginx, certificate by certbot; `deploy/ecosystem.vm.cjs`). "Test wallet in this
browser" is on, so a send can be tried without installing Freighter. A Face ID wallet made there
stays bound to that hostname; mainnet waits for the final domain.

## What works (testnet unless marked)

### Day 0 — verified before building

- **Toolchain**: stellar-cli 28.1.0 (upgraded from 27.0.0), Node 22.20, Rust pinned to 1.91.1 for
  this repo (`rust-toolchain.toml`: soroban-sdk 28 needs ≥ 1.91; the CLI refuses exactly 1.91.0),
  target `wasm32v1-none`.
- **Smoke 1, the passkey kit on Protocol 29** (`scripts/smoke/kit-testnet.ts`): a software passkey
  made wallet `CDBTEAVSV6F2XWDVWZ4IYOERAZHXDYUXXOALXTRFZOKLMVRF7A5JSCPY` through a relay paid by
  Sown's testnet account, deploy `e02290cbb468639345e5b7b3071707f002bca9da09f2325a2cee3867078db5c6`
  (8.8 s); the passkey then moved 1 XLM, `82e48f0ec931eeedfcbd6fc49b93b912465c9a8a003b636b360b4cffaae91777`
  (10.0 s). No XDR or auth errors: passkeys stay in.
- **Smoke 2, Aquarius from a contract** (`scripts/smoke/aquarius-testnet.ts`): the pool pulls with
  `transfer(user, pool, in)`, so the contract pre-authorises exactly that call. Swaps
  `97d726ae4939ca9b9ab39cce738b48dff1ec0ddc3e24db1b69d1ff250fb022f7` (XLM→USDC) and
  `7aa466e69696f28196c91cafac4d0194f4de8ef317cc0b1f1656beeef56046fb` (USDC→XLM). A swap without
  instruction headroom failed by 360 instructions: `6bc95adad78caa31989192f24c8f472cbaade7714d5b08a5641a2b3f961d1727`.
- **Smoke 3, the mainnet pools** (`scripts/smoke/mainnet-pools.ts`, simulation only): USDY $1.1348,
  USTRY $1.0788, CETES $0.06584; USDC is index 1 in all three (`docs/RESEARCH.md` §13).

### The contract

- **Deployed** (since 8 Oct, 22:33 UTC): `CCKMIXT4SERT4OFTIGCRLPAFPUED4WW6J7SKCZ46QBOLHBCV3CTAHQSB`;
  wasm 15,311 bytes, sha256 `7d047dcedfe73b692e2def44c1ab16634b0dfe4325c0e40ce9bdefb189c9e167`,
  dumped back from the ledger and compared. Upload `f084b0b9b1ab161cf21e950e47748e52be996efbd2eff4f3e608e226c99da277`,
  deploy `fde11ab9124e3857bc8c3b051227cd2ec848a9014d61f91c3079fcf09ae4b34c` (ledger 5,095,044),
  `set_asset(XLM stand-in)` `5e3391508daeea89d86879cda38000c7d18e27d8a9cf23ce2b677adce538a246`,
  instance and code extended to 60 days from outside `3a6516a0eb738032091aebdedc73a04f495fa84ebe7ebe8f6453994e37abbb68`.
- **Why it was redeployed**: the first contract (`CBNZK4NDWZZD5YBLK4GTUICA2RF7PIXL7RHADRVQSTYF7EQ4OSCGMOFB`,
  deploy `ea6952255a29e0f3bcc4fa8e2e9289f564687ced814b371a06af140470973e56`) extended its own
  instance on every call, and extending an instance extends its code, whose rent is charged on its
  in-memory size: that constructor paid 154.9 test XLM, and on mainnet a sender or a sponsored claim
  would have paid about 27 XLM whenever the instance fell under half its life. No function extends
  the contract's own life now; `npm run keep-alive` does it from outside. The first contract's
  transactions below stay as evidence of the same code paths.
- **Rust suite**: 23 tests green (`npm run contract:test`): the slice arithmetic, the min-out and a
  short fill reverting everything, the state machine, the signature binding the destination, the
  stranger's early refund, measure once at 30 days, the admin unable to touch an envelope, events,
  the envelope's TTL, no user call extending the contract's own life (mutation-checked), the
  claim-message bytes shared with TypeScript, and a property test over random send/claim/refund
  sequences holding balances equal to the sums over open envelopes.

### The battery (`npm run battery:testnet`, `deployments/testnet-battery.json`), all green

Run of 9 Oct on `CCKMIXT4…HQSB`:

| Step | Transaction |
| --- | --- |
| send 10 USDC keeping 10% → 104.66 XLM, one signature, 7.0 s | `06e5b39da138278a397e54e30d64e68ae1ec9d9ca3f478161cfddfb4cea7fcd9` |
| a brand-new classic wallet made ready to hold USDC (created with 0 XLM; one wallet approval) | `0dfcde7d7b0a1eb0b55b7562138271963f70a8ec26119a7d1ea27d39e42a89e1` |
| the claim into it, paid by Sown's servers (9 USDC + 104.66 XLM arrived) | `4884b7cb298eb2ab90abea4dd2a3a4cce34dacf44f54c1eebcd25fb9b2084fa3` |
| send 5 USDC keeping 10% | `c5b64782dc2f6c40941cedcee776fef85f2bfb9c83412a7e0d5f2dbb037e6007` |
| a wallet made with one (software) Face ID `CDO67GWS…RJGE`, deployed by Sown's servers | `ddeda510e59a23056076514fd5afa05aabfa420fdd90c24a7187d7484bb786d5` |
| the claim into that wallet (4.5 USDC + 52.28 XLM), 16.2 s for both, one prompt | `fcc73d60db9451f0a0ace30c47a86d1dd5bc1dfcb286b3226fd922d5e2cd15fb` |
| 1 XLM moved out of that wallet, one prompt, Sown's servers paid | `a192e510ef9a45bc440146a1aef43e8ae279175a91df2d030ea27d2dc20896f7` |
| send 2 USDC, then the sender takes it back | `13f1549b4cd20dd044aaf6780e4bb91abfb5fa53c32726b3f7abbe8458ecb38a`, `7a5edd7abe78415eef145ea3286bc6a2339aec235b5e9c7c2c7e4acce9414d85` |
| refused, costing Sown nothing: a second claim, a wrong link, a stranger's early refund, an early measurement | — |

The same battery on the first contract (8 Oct): send `8e574b77…568f`, classic claim `fcaff49b…6412`,
Face ID claim `222d5726…f282`, refund `9a50480f…0cc4`.

### The mainnet smoke, proven on testnet (`npm run smoke:mainnet -- --network testnet`)

The script the founder runs on mainnet, run with the same code on testnet (`deployments/testnet-smoke.json`):

| Step | Transaction |
| --- | --- |
| checks first: the code on the ledger is `artifacts/sown.wasm`, the asset is open with the catalogue's pool, both balances, the send simulated | — (`--dry` stops here) |
| send $1 keeping 10%, 7.8 s | `14a4935819102bef157663ce3848d63477b7094625e8d6487101c4cfb0328810` |
| a wallet made with one software passkey `CAHL4UCP…ZD6T` | `f80e296496a57e558adc1d872ff806e95f90d895ad1b8667c034040708d95d19` |
| the claim into it, 14.3 s for both; 15 s from send to claim on the ledger | `a3e539337c550bca5351e7bb415d517a33de295a2b2508c84107149fbb48c03d` |
| 0.90 USDC moved back to the sender (the wallet restored from its saved key, as `--recover` does) | `486a86431d5e8aded623ae755026d070232521565078546ae104fa45bc523230` |
| 10.47 XLM moved back to the sender; the wallet empty, its key deleted | `210c6855e9ce698026fe0a593ce69617c3a4daffa3d9f09be9b679c044b84445` |

`--record <id>` read envelope 0 (into a classic wallet, 10 s send to claim) and envelope 4 (into a
Face ID wallet, 15 s) back from the chain correctly.

### The app (`npm run dev`, port 3100), verified in a browser against testnet

- **On the redeployed contract (9 Oct), at 375 px**: $5 sent from the test wallet keeping 10%
  (the card, the confirm sheet, the receipt with the link), envelope 9:
  `d0e66066c78b5c91615e2a22145c9c2371f92a2cac892fc342553d831459271c`; claimed from the claim page
  into a Stellar wallet: `2354e843c3f7092d901a7056b6143e0e291a0009915a85516e482b18072e0e0f`.
- **Every state at 375 px and 1440 px** (9 Oct): the send card (signed out, reading the wallet,
  short of USDC, quoting, quoted), the confirm sheet (preparing, ready, sending), the receipt
  with the link, the claim page (opening, open, claiming, claimed into a Stellar wallet, returned,
  incomplete link, no such envelope), `/receipt` (waiting, claimed, returned), `/mine` (signed
  out, holding), `/sent` (loading, a list), `/assets`, `/proof`, `/plan`, `/docs`, the menu, and
  the not-found page. No page scrolls sideways at 375 px; every standalone target is 44 px.
  Fixed on the way: the hero and three other sections lost their own top padding to the
  section's; the confirm sheet opened scrolled past its outcome (the browser focused the first
  enabled control); a short wallet disabled the button without saying why; the live line jumped
  when the local money arrived; the amount field drew two focus rings; footer links and text
  buttons were 21 px tall; a classic claim showed Face ID's icon and words, and "Try again" after
  a failed classic claim started a Face ID claim; a stretched `/proof` section grew its label;
  `/mine` printed the dollars as large as the keep; the receipt, the claim states and the
  returned state had no page heading; `/proof` said a word the surfaces never say (the words test
  now reads JSX text beside expressions too, and caught it); the test wallet in this browser is
  declared as team.

Run against the first contract on 8 Oct; the code paths are unchanged since:

- **Send from the test wallet** (a Wallets Kit module, testnet only, behind
  `NEXT_PUBLIC_SOWN_TEST_WALLET=1`): the card, the confirm sheet (simulated fee, the least it can
  become, the return date, the issuer), the wallet, `/api/send/record`, the receipt with the link:
  `5aa81c440aaf89927da260fd0e9c1b7bebf4375302a9c12e57fb8fc70ea9a1ee`; then the classic-wallet
  claim from the claim page: `826c07a2c3199df6024ad7f7671ca08fa48b9d84f13495ea3b44531e8e7648a1`.
- **Claim with Face ID, in the browser**: the real Smart Account Kit in the page (a software P-256
  authenticator stood in for the phone's), the real `/api/relay`, one passkey prompt each:
  send `5dff843affb0ce74a87b2548af0e9e2ef96cdb1c269eb9925564bdf3fc985801` → wallet `CCDTVZEY…YNF`,
  claim `9959b3598e51ef79c6926671b67e4bd180735abd8eba42cb9a0d4c7a73e46710`; send
  `485a42a14c7c78394ab4e04c068269fb79e5cadc627b2add48f071dad586b96c` → wallet `CCCQCWLG…YRJN`,
  claim `d3477f0b813fc795e5886b6b8180f45c8ad1977f4e34481347044505f6e07e52`.
- **Move to a wallet** from `/mine`: 5 XLM out of `CCCQCWLG…YRJN`, one passkey prompt, none to
  reconnect: `5761e5745d1cc67142e573c958e1fe2cb330e64581dd6e30311acba8c64909aa`.
- **Pages seen rendering from the chain**: `/`, `/r/[id]` (waiting, claiming, claimed, wrong-link),
  `/receipt/[id]`, `/mine`, `/assets` (the three mainnet rows with Ondo's and Etherfuse's flags read
  from mainnet), `/proof` (ink), `/docs` (six pages), `/plan`, the share images.
- **Production build**: `npm run build` (into `.next-build`) and `npm run start` serve every page
  and the share images (9 Oct).

### Tests

- **Offline suite**: 128 Vitest tests in 19 files, plus lint and typecheck, all clean (4 more skip:
  the live and mainnet-only ones). Among them: the relay's inspection against real recorded
  transactions and every near-miss; the claim message's bytes; the send arithmetic; the envelope
  decoder on real `get()` results; **two lists that drift**: every catalogue asset's contract
  against the address its code and issuer derive, the deployment record against the catalogue,
  the deployed sha256 against `artifacts/sown.wasm`, and the README naming the deployed contract;
  the transaction cache keyed by contract; and a scan of every surface, the README, and the
  evidence `/proof` prints for the words Sown never says.
- **Live** (`SOWN_LIVE=1 npx vitest run src/lib/assets/parity.test.ts`): the contract's `asset()`
  and `config()` against the catalogue, green on testnet.

### Mainnet, measured and simulated, nothing sent (`npm run preflight`, 9 Oct)

| What | Cost | Who pays |
| --- | --- | --- |
| upload the code (rent on the compiled module's size for 120 days) | 22.08 XLM ≈ $4.25 | the admin |
| create the contract, three assets | 0.08 XLM | the admin |
| one send (the envelope kept about 180 days) | 0.21 XLM ≈ $0.04 (0.28 the first time) | the sender |
| one Face ID claim: the wallet, then the claim | 0.20 + 0.09 XLM | Sown's servers |
| one claim into a classic wallet | 0.014 XLM, plus 2 XLM set aside if the wallet is brand new (returned when it lets go) | Sown's servers |
| keep the contract alive after its first 120 days | about 4.8 XLM per 30 days | whoever runs Sown |

## Cut, and why

- **Nothing from the cut list.** The passkey claim (cut line 6) claimed testnet envelopes on Day 1
  and stays in. `/plan`, USTRY and CETES, "Move to a wallet", the share images and the six docs
  pages all shipped.
- **The fee-bump shape for a classic wallet's claim**: every claim is submitted by Sown's servers
  instead (one shape fewer to inspect; recorded in `CLAUDE.md` Known drift).

## Next, in build-plan order

Everything in Day 3's code part is done. What remains needs the founder (below): the domain,
mainnet funds, the deploy, the phone, the film. The README's GIF comes from the film; a
placeholder comment marks the spot.

## Known limits (not blocking the submission)

- **A move out of a Face ID wallet** looks for the wallet's claim among the 300 newest envelopes;
  past 300 envelopes an older claimer's move would be refused until the cache can look claims up
  by wallet.
- **A receipt older than RPC's event history** (about a week) links its transactions only if this
  server's cache saw them; the cache is on by default, so run the mainnet server with its `var/`
  kept between deploys.
- **The Face ID claim in a browser** was verified on the first contract; on the redeployed one the
  same server path ran in the battery and the smoke, and the classic claim ran in the browser.

## Decisions (recorded in CLAUDE.md "Known drift")

- **The link's secret is an ed25519 seed; a claim is a signature over (contract, id, to).** The
  secret never reaches a server or the ledger, a claim cannot be redirected, and the recipient sees
  one Face ID instead of two.
- **Every claim is submitted by Sown's servers**; there is no fee-bump shape.
- **A fourth relay shape: moving out of a passkey wallet**, only Sown's assets, only from a wallet
  that claimed an envelope, a few times a day.
- **Testnet runs on Aquarius's test USDC**, the asset in its only USDC/XLM pool.
- **The contract never extends its own instance or code**; `npm run keep-alive` does, paid by whoever
  runs Sown. Each envelope keeps the maximum TTL for itself.
- **The deploy picks up where it stopped** instead of paying twice: code already on the ledger is
  not uploaded again, and a half-made deployment (`partial` in `deployments/<network>.json`) is
  resumed, never treated as live.
- **The mainnet smoke moves its dollar back**, and keeps the wallet's key under `.keys/` until the
  wallet is empty; the filmed run is recorded from the chain with `--record`.
- **The cache is keyed by contract**: a redeploy numbers envelopes from 0 again.

## Blocked on the founder, in order

1. **Confirm the deadline hour** on demo.stellarpassport.xyz and paste the submission fields into
   `docs/DEMO-AND-PITCH.md` §Submission.
2. **Choose the domain and host the app on it** (TLS required for Face ID). Passkeys bind to the
   origin they were made on, so the domain must be final before the first mainnet claim. On the
   server: `npm ci && npm run build`, then `npm run start` (port 3100, from `.next-build`) behind
   nginx, e.g. under pm2. Environment: `NEXT_PUBLIC_SOWN_NETWORK=mainnet`,
   `NEXT_PUBLIC_SITE_URL=https://<domain>`, `SOWN_SPONSOR_SECRET`, `NEXT_PUBLIC_REPO_URL`; a paid
   RPC (`SOWN_RPC_URL`, `NEXT_PUBLIC_SOWN_RPC_URL`) is worth it once strangers arrive.
3. **Fund three mainnet accounts** (no secret ever goes into git; each is read from the environment):
   - the **admin**, about **24 XLM** (upload 22.1, create and assets 0.1, its own 1 XLM minimum);
     its key stays on your machine;
   - **Sown's servers** (`SOWN_SPONSOR_SECRET`), **30–60 XLM**: about 0.3 XLM per Face ID claim,
     2 XLM set aside per brand-new classic wallet, alerts under 20 XLM;
   - a **smoke sender** (`SOWN_SMOKE_SENDER_SECRET`, e.g. `stellar keys generate sown-smoke`):
     **$2 USDC and 3 XLM**; and your **Freighter** wallet for the film: about **$20 USDC and 2 XLM**.
4. **Deploy**: `npm run preflight`, then
   `SOWN_ADMIN_SECRET=S… SOWN_MAINNET=yes npm run contract:deploy:mainnet` (if it stops, run it
   again: it resumes). Add your wallets (admin, servers, smoke sender, Freighter) to `src/lib/team.ts`.
5. **Smoke**: `npm run smoke:mainnet -- --dry` (read only) with `SOWN_SPONSOR_PUBLIC` and
   `SOWN_SMOKE_SENDER_PUBLIC`, then `SOWN_MAINNET=yes SOWN_SPONSOR_SECRET=S… SOWN_SMOKE_SENDER_SECRET=S… npm run smoke:mainnet`.
   It sends $1 into USDY, claims it, moves both parts back, and writes `deployments/mainnet-smoke.json`.
6. **Put the mainnet contract id into the README** (a test fails until it is there) and commit
   `deployments/mainnet.json` and `deployments/mainnet-smoke.json`.
7. **The film**: send $1–$50 from Freighter on the final domain and claim it on a real phone with
   Face ID; then `npm run smoke:mainnet -- --record <id>` within a few days (the network forgets
   events after about a week) so `/proof` prints it.
8. **A real phone on testnet first**: the founder claimed envelope 12 on a MacBook with Touch ID
   (10 Oct). A fresh open envelope for the phone is made from the card with "Try it with a test
   wallet"; its link is given in chat and lives in the sender's browser storage (a claim link is
   never written into the repository). Open it on a
   phone, tap "Claim with Face ID", and the gift should say "Stays yours · in your wallet". For
   more: `npx tsx scripts/dev-send.ts 5 10` prints a fresh link, or send one from the card with
   "Try it with a test wallet".
9. **Keep it alive**: by about 120 days after the deploy, `SOWN_ADMIN_SECRET=S… SOWN_MAINNET=yes npm run keep-alive -- --network mainnet --days 180`
   (about 4.8 XLM per 30 days extended); and
   `SOWN_MEASURER_SECRET=S… SOWN_MAINNET=yes npm run measure -- --network mainnet` on a cron from
   30 days after the first claim (any funded account can measure).
10. **Publish the repository** (no remote has been added) and set `NEXT_PUBLIC_REPO_URL`.
