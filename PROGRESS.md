# Progress

> Kept by the build agent. Every "works" line names the transaction that proves it; each hash
> opens on `https://stellar.expert/explorer/testnet/tx/<hash>`. Last updated Thu 8 Oct 2026, evening.

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

- **Deployed**: `CBNZK4NDWZZD5YBLK4GTUICA2RF7PIXL7RHADRVQSTYF7EQ4OSCGMOFB`; wasm 15,372 bytes, sha256
  `791ace708783ed3d97b4b02ef33e5768b04d93fe8c3ca43ec366a5702e5897ce`, dumped back from the ledger
  and compared. Upload `d26dd7849e9df92d6cbad0e78f29f8834cdbe8002d6a897e05ce6f232c0f8574`, deploy
  `ea6952255a29e0f3bcc4fa8e2e9289f564687ced814b371a06af140470973e56`, `set_asset(XLM stand-in)`
  `1697e099b319eb1741b192946551723ea38275567dc1b829a8e41fe5b9cceb1a`.
- **Rust suite**: 22 tests green (`npm run contract:test`): the slice arithmetic, the min-out and a
  short fill reverting everything, the state machine, the signature binding the destination, the
  stranger's early refund, measure once at 30 days, the admin unable to touch an envelope, events,
  the TTL, the claim-message bytes shared with TypeScript, and a property test over random
  send/claim/refund sequences holding balances equal to the sums over open envelopes.

### The battery (`npm run battery:testnet`, `deployments/testnet-battery.json`), all green

| Step | Transaction |
| --- | --- |
| send 10 USDC keeping 10% → 93.54 XLM, one signature, 4.2 s | `8e574b773c437c897f067598106a87bd8f7d513fd2807965841c1a8e4cbf568f` |
| a brand-new classic wallet made ready to hold USDC (created with 0 XLM; one wallet approval) | `67c3f71bdbc003735386d41ef24b3a884fa656176faca98db6d12ceab6a1cd0c` |
| the claim into it, paid by Sown's servers (9 USDC + 93.54 XLM arrived) | `fcaff49b6e3393595611403339105caa2fa027e4be66c3bd5aa59955b1856412` |
| send 5 USDC keeping 10% | `e61df42cde4687402072a85c2c8357018394a96c3e213efcbd078766d4049bd0` |
| a wallet made with one (software) Face ID, deployed by Sown's servers | `7ab7561399537d928a9a98847981dc0b0687c09b6a2ad53e6b819028c2bde8f3` |
| the claim into that wallet (4.5 USDC + 46.72 XLM), 12.6 s for both | `222d5726ad18c172c33e18da7dcda67b33ad4f3a73bdf59ba416b464ce40f282` |
| send 2 USDC, then the sender takes it back | `31ed4d45b580b1da89f9e77e6c6d7fd106bdd5213aca0ea6f5e3912aa7b8c41d`, `9a50480f826f07d22e1fb947686765d815f16de90b1b4d663076b322126a0cc4` |
| refused, costing Sown nothing: a second claim, a wrong link, a stranger's early refund, an early measurement | — |

### The app (`npm run dev`, port 3100), verified in a browser against testnet

- **Claim with Face ID, in the browser**: the real Smart Account Kit running in the page (a software
  P-256 authenticator stood in for the phone's), the real `/api/relay`. One passkey prompt each.
  - envelope 4 (send `5dff843affb0ce74a87b2548af0e9e2ef96cdb1c269eb9925564bdf3fc985801`) into wallet
    `CCDTVZEY554I5R2MHMG7KJ36V7OHUKCRSTPHNF2EBFJBIO24FLZINYNF`, claim `9959b3598e51ef79c6926671b67e4bd180735abd8eba42cb9a0d4c7a73e46710`
  - envelope 5 (send `485a42a14c7c78394ab4e04c068269fb79e5cadc627b2add48f071dad586b96c`) into wallet
    `CCCQCWLGYB42MNAFPO4T3L7YSKUVIRLLGXQNKFBG6OWUMX2RVKSXYRJN`, claim `d3477f0b813fc795e5886b6b8180f45c8ad1977f4e34481347044505f6e07e52`
- **Move to a wallet** from `/mine`: 5 XLM out of `CCCQCWLG…YRJN`, one passkey prompt (reconnecting
  needed none: the wallet's birth is written into the kit's store after the relay deploys it),
  submitted by Sown's servers: `5761e5745d1cc67142e573c958e1fe2cb330e64581dd6e30311acba8c64909aa`.
- **Pages seen rendering from the chain**: `/` (send card with the pool's live quote and local
  money), `/r/[id]` (waiting, claiming, claimed, wrong-link states), `/receipt/[id]` (the send and
  claim transactions from the contract's events, "at the least" from the send's own arguments,
  "a wallet made with Face ID" checked by the claimer's wasm hash), `/mine` (holdings worth at
  Aquarius's price, envelopes, move, cash-out links verified to resolve), `/assets` (on testnet,
  the stand-in plus the three mainnet rows with Ondo's and Etherfuse's flags read from mainnet),
  `/proof` (ink: code hash dumped back and matching the repository, the admin's one power, what
  Sown's servers hold and have paid, counts, pools, every envelope, the battery's transactions),
  `/docs` (six pages), `/plan`, the share images (`/receipt/1/opengraph-image` and the figure-free
  `/r/5/opengraph-image`).
- **Offline suite**: 115 Vitest tests in 15 files, plus lint and typecheck, all clean: the relay's
  inspection against real recorded deploy and move transactions and every near-miss, the claim
  message's bytes, the quote and send arithmetic, the envelope decoder on real `get()` results, the
  issuer line, the plan's calendar file, the pinned versions, the docs links, the share images'
  colours against `tokens.css`, and a scan of every surface for the words Sown never says.

## Next, in build-plan order

1. **The sender's path in a browser**: send card → confirm sheet → wallet → `/api/send/record` →
   receipt with the link, and the classic-wallet claim. No wallet extension can be installed in the
   agent's browser, so: a testnet-only test wallet behind a flag (a Wallets Kit module holding a key
   in the browser, funded by Friendbot and Aquarius), which also lets anyone try testnet without
   installing anything.
2. **The battery**: add moving out of a passkey wallet (shape 4) and the app's own HTTP routes.
3. **Mainnet scripts, written and not run**: `smoke:mainnet`, `preflight`, `measure`.
4. **Two lists that drift**: the catalogue against the contract's `asset()` (a live test), and the
   contract id in `deployments/`, the README and `/proof`.
5. **README** above the fold.
6. **Every state at 375 px and 1440 px.**

## Decisions (recorded in CLAUDE.md "Known drift")

- **The link's secret is an ed25519 seed; a claim is a signature over (contract, id, to).** The
  secret never reaches a server or the ledger, a claim cannot be redirected, and the recipient sees
  one Face ID instead of two.
- **Every claim is submitted by Sown's servers**; there is no fee-bump shape. A classic wallet
  approves once, only to be made ready to hold the assets.
- **A fourth relay shape: moving out of a passkey wallet**, only Sown's assets, only from a wallet
  that claimed an envelope, a few times a day.
- **Testnet runs on Aquarius's test USDC**, the asset in its only USDC/XLM pool.
- **The receipt's TTL stays at the network maximum.** It is almost the whole fee: about 1.1 XLM per
  send on testnet, about 0.2 XLM (about 4 cents) on mainnet. The confirm sheet shows the simulated fee.
- **Every submitted simulation carries 1M instructions of headroom.**

## Blocked on the founder

1. **Confirm the deadline hour** on demo.stellarpassport.xyz and paste the submission fields into
   `docs/DEMO-AND-PITCH.md` §Submission.
2. **Choose the domain.** Passkeys bind to the origin they were made on, so the domain must be final
   before the first mainnet claim. Set `NEXT_PUBLIC_SITE_URL` to it.
3. **Fund a mainnet account for Sown's servers** with about 60 XLM and put its secret in the
   server's environment as `SOWN_SPONSOR_SECRET` (never in git).
4. **Fund a Freighter wallet** with about 20 USDC on mainnet, and a little XLM for fees (a send is
   about 0.2 XLM).
5. **Deploy to mainnet**: `npm run contract:build`, then
   `SOWN_ADMIN_SECRET=S… SOWN_MAINNET=yes npm run contract:deploy:mainnet` (the admin key stays on
   your machine), then `npm run smoke:mainnet`. Add your wallets to `src/lib/team.ts` first.
6. **A real phone**: claim one testnet envelope with real Face ID on the final domain
   (`npx tsx scripts/dev-send.ts 5 10` prints a fresh link), and one send from a real Freighter.
7. **Publish the repository** (no remote has been added) and set `NEXT_PUBLIC_REPO_URL`.
