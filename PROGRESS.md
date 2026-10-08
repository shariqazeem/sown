# Progress

> Kept by the build agent. Every "works" line names the transaction that proves it; every hash
> opens on `https://stellar.expert/explorer/testnet/tx/<hash>`. Updated as work lands.

## What works (testnet unless marked)

### Day 0 — verified before building

- **Toolchain**: stellar-cli 28.1.0 (upgraded from 27.0.0), Node 22.20, Rust pinned to 1.91.1
  for this repo (`rust-toolchain.toml`), `wasm32v1-none`.
- **Smoke 1, the passkey kit on Protocol 29**: a software passkey made a wallet through a relay
  paid by Sown's testnet sponsor (`e02290cb…db5c6`, 8.8 s), then moved 1 XLM with the passkey
  (`82e48f0e…91777`, 10.0 s). No XDR or auth errors. Passkeys stay in.
- **Smoke 2, Aquarius from a contract**: the pool pulls with `transfer(user, pool, in)`; the
  contract pre-authorises exactly that call. Swap from a G-account `7aa466e6…046fb`.
- **Smoke 3, the mainnet pools**: estimates for 1/10/100 USDC on USDY, USTRY, CETES, read by
  simulation (`docs/RESEARCH.md` §13).

### Day 1 — the contract and the money paths

- **Contract** `CBNZK4NDWZZD5YBLK4GTUICA2RF7PIXL7RHADRVQSTYF7EQ4OSCGMOFB` on testnet; wasm
  15,372 bytes, sha256 `791ace708783ed3d97b4b02ef33e5768b04d93fe8c3ca43ec366a5702e5897ce`, dumped
  back from the ledger and compared. Deploy `ea6952255a29e0f3bcc4fa8e2e9289f564687ced814b371a06af140470973e56`,
  `set_asset(XLM stand-in)` `1697e099b319eb1741b192946551723ea38275567dc1b829a8e41fe5b9cceb1a`.
- **Rust suite**: 22 tests green (`npm run contract:test`), including a property test over random
  send/claim/refund sequences and the claim-message byte fixture shared with TypeScript.
- **The battery** (`npm run battery:testnet`, `deployments/testnet-battery.json`), all green:

  | Step | Transaction |
  | --- | --- |
  | send 10 USDC keeping 10% → 93.54 XLM, one signature, 4.2 s | `8e574b773c437c897f067598106a87bd8f7d513fd2807965841c1a8e4cbf568f` |
  | a brand-new classic wallet: created with 0 XLM and its USDC trustline sponsored (one wallet approval) | `67c3f71bdbc003735386d41ef24b3a884fa656176faca98db6d12ceab6a1cd0c` |
  | the claim into it, paid by Sown's servers (9 USDC + 93.54 XLM arrived) | `fcaff49b6e3393595611403339105caa2fa027e4be66c3bd5aa59955b1856412` |
  | a passkey wallet made with one (software) Face ID, deployed by Sown's servers | `7ab7561399537d928a9a98847981dc0b0687c09b6a2ad53e6b819028c2bde8f3` |
  | the claim into the passkey wallet (4.5 USDC + 46.72 XLM arrived), 12.6 s for both | `222d5726ad18c172c33e18da7dcda67b33ad4f3a73bdf59ba416b464ce40f282` |
  | the sender took a send back | `9a50480f826f07d22e1fb947686765d815f16de90b1b4d663076b322126a0cc4` |
  | refused, costing Sown nothing: a second claim, a wrong link, a stranger's early refund, an early measurement | — |

## Next

1. The app: `/` send card + confirm sheet + Wallets Kit, `/api/quote`, `/api/send/prepare`,
   `/api/send/record`, `/receipt/[id]`, `/r/[id]` (both claim paths), `/api/relay`.
2. `/mine`, `/assets`, `/sent`, `/proof`, README.
3. Every state at 375 and 1440 px, the OG image, `/docs/*`, `/plan`.

## Decisions (recorded in CLAUDE.md "Known drift")

- **The link's secret is an ed25519 seed; a claim is a signature over (contract, id, to).** The
  secret never reaches a server or the chain, a claim cannot be redirected, and the recipient sees
  one Face ID instead of two.
- **Testnet runs on Aquarius's test USDC**, the asset in its only USDC/XLM pool.
- **The receipt's TTL stays at the network maximum.** It is the whole fee: ~1.1 XLM per send on
  testnet, ~0.2 XLM on mainnet. The confirm sheet shows the simulated fee.
- **Every submitted simulation carries 1M instructions of headroom** after an Aquarius swap
  failed by 360 instructions.

## Blocked on the founder

1. **Confirm the deadline hour** on demo.stellarpassport.xyz and paste the submission fields into
   `docs/DEMO-AND-PITCH.md` §Submission.
2. **Choose the domain.** Passkeys bind to the origin they were made on: the domain must be final
   before the first mainnet claim. Set `NEXT_PUBLIC_SITE_URL` to it.
3. **Fund a mainnet sponsor** with about 60 XLM and put its secret in the server's environment as
   `SOWN_SPONSOR_SECRET` (never in git).
4. **Fund a Freighter wallet** with about 20 USDC on mainnet (and a little XLM for fees: a send is
   about 0.2 XLM).
5. **Deploy to mainnet**: `npm run contract:build` then
   `SOWN_ADMIN_SECRET=S… SOWN_MAINNET=yes npm run contract:deploy:mainnet` (the admin key stays on
   your machine), then `npm run smoke:mainnet`.
