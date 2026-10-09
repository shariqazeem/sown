"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Copy, Fingerprint } from "lucide-react";
import { SownMark } from "@/components/brand/mark";
import { useLocalMoney } from "@/components/money/use-local-money";
import { SkeletonEnvelope } from "@/components/skeleton/skeleton";
import { useTxToast } from "@/components/toast/use-tx-toast";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { decodeSecret, secretOpens, signClaim } from "@/lib/envelope/claim";
import { type Note, verifiedNote } from "@/lib/envelope/note";
import { type EnvelopeJson, envelopeFromJson } from "@/lib/envelope/types";
import { returnWords } from "@/lib/envelope/view";
import { dateUTC, fromRaw, short, stampUTC, units, usdAligned } from "@/lib/format";
import { rememberClaim, saveWallet, savedWallet } from "@/lib/local";
import { faceSupport, inAppBrowser, makeWallet, recordBirth } from "@/lib/passkey/client";
import { type WalletOption, connectWallet, signWith } from "@/lib/wallet/kit";

/**
 * THE CLAIM. A gift, read from the contract: who sent it, how much in the reader's own money,
 * what is theirs to spend and what stays theirs, the note if the ledger vouches for it, and one
 * button, "Claim with Face ID": the phone makes a passkey (the one Face ID), Sown's servers
 * deploy the wallet and submit the claim the link signed. Or a Stellar wallet: Sown's servers
 * prepare it to hold these assets (one approval, the first time) and submit the claim. The
 * secret never leaves this page: only a signature naming the wallet does.
 */
type Read = { envelope: EnvelopeJson; claimTx: string | null } | { error: string; missing: boolean };
type AssetView = { ticker: string; name: string; fullName: string; issuerName: string; standIn: boolean; disclosure: string };
type Phase = "idle" | "making" | "preparing" | "approving" | "claiming" | "done" | "failed";

export function ClaimCard({ id, read, asset, passphrase, testnet, explorer, contractId }: { id: string; read: Read; asset: AssetView | null; passphrase: string; testnet: boolean; explorer: string; contractId: string }) {
  const [secret, setSecret] = useState<Uint8Array | null | undefined>(undefined);
  const [note, setNote] = useState<Note | null>(null);
  const [face, setFace] = useState<"yes" | "no" | "maybe" | null>(null);
  const [inApp, setInApp] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<EnvelopeJson | null>("envelope" in read ? read.envelope : null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [why, setWhy] = useState<string | null>(null);
  const [mine, setMine] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [into, setInto] = useState<{ kind: "passkey" | "classic"; address: string } | null>(null);
  const [via, setVia] = useState<{ kind: "passkey" } | { kind: "classic"; wallet: WalletOption; address: string } | null>(null);
  const [claimTx, setClaimTx] = useState<string | null>("envelope" in read ? read.claimTx : null);

  useEffect(() => {
    setSecret(decodeSecret(window.location.hash));
    if ("envelope" in read) setNote(verifiedNote(window.location.hash, read.envelope.memoHex));
    setInApp(inAppBrowser());
    setMine(savedWallet()?.contractId ?? null);
    void faceSupport().then(setFace);
  }, [read]);

  const busy = phase === "making" || phase === "preparing" || phase === "approving" || phase === "claiming";
  const toastPhase = phase === "making" || phase === "preparing" ? "building" : phase === "approving" ? "signing" : phase === "claiming" ? "confirming" : phase === "done" ? "done" : phase === "failed" ? "failed" : "idle";
  useTxToast(toastPhase, "Claim", { detail: why ?? undefined, href: phase === "done" ? `/receipt/${id}?claimed=1` : undefined });

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/envelope/${id}`, { cache: "no-store" });
      if (!r.ok) return;
      const body = (await r.json()) as { envelope: EnvelopeJson; claimTx: { hash: string } | null };
      setEnvelope(body.envelope);
      if (body.claimTx) setClaimTx(body.claimTx.hash);
    } catch {
      // The page keeps what it had; the receipt link still works.
    }
  }, [id]);

  if ("error" in read) {
    return (
      <div className="sw-claim">
        <div className="sw-claim-words">
          <p className="sw-kicker">Envelope {id}</p>
          <h1 className="sw-h1">{read.missing ? "There is no envelope with that number." : "Your envelope could not be read just now."}</h1>
          <p className="sw-lede">{read.missing ? "Check the link with whoever sent it." : `${read.error} Nothing is lost; open the link again in a moment.`}</p>
        </div>
      </div>
    );
  }
  if (!envelope || secret === undefined) {
    return (
      <div className="sw-claim">
        <SkeletonEnvelope label="Opening your envelope" />
      </div>
    );
  }

  const e = envelopeFromJson(envelope);
  const total = e.cash + e.keepIn;
  const ticker = asset?.ticker ?? "units";
  const opens = secret ? secretOpens(secret, e.claimKeyHex) : false;

  const claimPasskey = async () => {
    if (!secret) return;
    setWhy(null);
    setVia({ kind: "passkey" });
    setPhase("making");
    const made = await makeWallet(`Sown envelope ${id}`);
    if (!made.ok) {
      setPhase(made.why ? "failed" : "idle");
      setWhy(made.why || null);
      return;
    }
    setPhase("claiming");
    const sig = signClaim(secret, contractId, e.id, made.value.contractId).toString("hex");
    try {
      const res = await fetch("/api/relay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "passkey", id, to: made.value.contractId, sig, func: made.value.func, auth: made.value.auth }),
      });
      const body = (await res.json()) as { ok: boolean; why?: string; claimTx?: string; deployTx?: string; deployLedger?: number };
      if (!body.ok) {
        setPhase("failed");
        setWhy(body.why ?? "The claim did not go through.");
        return;
      }
      saveWallet({ contractId: made.value.contractId, credentialId: made.value.credentialId, at: Math.floor(Date.now() / 1000) });
      setInto({ kind: "passkey", address: made.value.contractId });
      await recordBirth(made.value.credentialId, made.value.contractId, body.deployTx, body.deployLedger);
      rememberClaim(id);
      setMine(made.value.contractId);
      if (body.claimTx) setClaimTx(body.claimTx);
      await refresh();
      setPhase("done");
    } catch {
      setPhase("failed");
      setWhy("Could not reach Sown's servers. Nothing moved; your envelope is still waiting.");
    }
  };

  const openWallets = () => {
    setWhy(null);
    setSheet(true);
  };

  const claimClassic = async (w: WalletOption) => {
    if (!secret) return;
    setWhy(null);
    const c = await connectWallet(passphrase, w.id);
    if (!c.ok) {
      if (c.why) setWhy(c.why);
      return;
    }
    setSheet(false);
    const account = c.value.address;
    setVia({ kind: "classic", wallet: w, address: account });
    setPhase("preparing");
    try {
      const post = (body: Record<string, unknown>) =>
        fetch("/api/relay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json() as Promise<{ ok: boolean; why?: string; ready?: boolean; xdr?: string; tx?: string; claimTx?: string }>);
      const prep = await post({ kind: "trustlines", id, account });
      if (!prep.ok) {
        setPhase("failed");
        setWhy(prep.why ?? "Your wallet could not be prepared.");
        return;
      }
      if (prep.xdr) {
        setPhase("approving");
        const signed = await signWith(passphrase, w.id, prep.xdr, account);
        if (!signed.ok) {
          setPhase(signed.why ? "failed" : "idle");
          setWhy(signed.why || null);
          return;
        }
        setPhase("preparing");
        const done = await post({ kind: "trustlines", id, account, signed: signed.value });
        if (!done.ok) {
          setPhase("failed");
          setWhy(done.why ?? "Your wallet could not be prepared.");
          return;
        }
      }
      setPhase("claiming");
      const sig = signClaim(secret, contractId, e.id, account).toString("hex");
      const claimed = await post({ kind: "claim", id, to: account, sig });
      if (!claimed.ok) {
        setPhase("failed");
        setWhy(claimed.why ?? "The claim did not go through.");
        return;
      }
      rememberClaim(id);
      setInto({ kind: "classic", address: account });
      if (claimed.claimTx) setClaimTx(claimed.claimTx);
      await refresh();
      setPhase("done");
    } catch {
      setPhase("failed");
      setWhy("Could not reach Sown's servers. Nothing moved; your envelope is still waiting.");
    }
  };

  const passkeyHere = e.state === "claimed" && ((into?.kind === "passkey" && into.address === e.claimedBy) || (!!mine && e.claimedBy === mine));
  const classicHere = e.state === "claimed" && into?.kind === "classic" && into.address === e.claimedBy;
  const gift = <Gift e={e} total={total} asset={asset} ticker={ticker} note={note} yours={passkeyHere || classicHere} fresh={phase === "done"} claimTx={claimTx} explorer={explorer} />;

  // ── claimed: the receipt, landing if it was claimed here and now ──
  if (e.state === "claimed") {
    return (
      <div className="sw-claim">
        {gift}
        <div className="sw-claim-after">
          <h1 className="sw-sr">Envelope {id}, claimed</h1>
          {passkeyHere ? (
            <>
              <Link href="/mine" className="sw-btn is-primary is-block">
                Open your wallet
              </Link>
              <p className="sw-claim-under">
                Your wallet opens with your face, on this phone.{" "}
                <Link href={`/receipt/${id}`} className="sw-link">
                  The receipt
                </Link>
              </p>
            </>
          ) : classicHere ? (
            <>
              <Link href={`/receipt/${id}`} className="sw-btn is-primary is-block">
                See the receipt
              </Link>
              <p className="sw-claim-under">
                The dollars and the keep are in your wallet, <span className="mono">{short(e.claimedBy ?? "")}</span>. Open it in its own app to spend them or cash out.
              </p>
            </>
          ) : (
            <p className="sw-claim-under">
              This envelope was claimed.{" "}
              <Link href={`/receipt/${id}`} className="sw-link">
                See its receipt
              </Link>
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── returned ──
  if (e.state === "returned") {
    return (
      <div className="sw-claim">
        {gift}
        <div className="sw-claim-after">
          <h1 className="sw-claim-title">{returnWords(e)}</h1>
          <p className="sw-claim-under">Ask them to send again. A new send makes a new link.</p>
        </div>
      </div>
    );
  }

  // ── open, but the link is missing its secret or it is the wrong one ──
  if (!secret || !opens) {
    return (
      <div className="sw-claim">
        {gift}
        <div className="sw-claim-after">
          <h1 className="sw-claim-title">This link is incomplete.</h1>
          <p className="sw-claim-say">Ask the sender to share it again from their sends page. The part of the link that opens the envelope is missing or changed.</p>
        </div>
      </div>
    );
  }

  // ── open, with the right secret ──
  const noFace = face === "no" || (inApp !== null && face !== "yes");
  return (
    <div className="sw-claim">
      {gift}
      <div className="sw-claim-after">
        {noFace ? (
          <>
            <h1 className="sw-claim-title">Open this link in Safari or Chrome.</h1>
            <p className="sw-claim-say">
              {inApp ? `${inApp}'s own browser` : "This browser"} cannot make a wallet with your face. Copy the link, then paste it into Safari or Chrome. Your envelope waits.
            </p>
            <button type="button" className="sw-btn is-primary is-block" onClick={() => void navigator.clipboard?.writeText(window.location.href)}>
              <Copy size={16} strokeWidth={2} aria-hidden />
              Copy the link
            </button>
            <button type="button" className="sw-textbtn sw-claim-alt" onClick={openWallets} disabled={busy}>
              I already have a Stellar wallet
            </button>
          </>
        ) : (
          <>
            <h1 className="sw-sr">Your envelope, waiting for you to claim it</h1>
            <button type="button" className="sw-btn is-primary is-block sw-claim-go" onClick={() => void (via?.kind === "classic" ? claimClassic(via.wallet) : claimPasskey())} disabled={busy}>
              {via?.kind === "classic" ? null : <Fingerprint size={20} strokeWidth={2} aria-hidden />}
              {phase === "making" ? "Making your wallet…" : phase === "claiming" ? "Claiming…" : phase === "preparing" ? "Preparing your wallet…" : phase === "approving" ? "Approve in your wallet…" : phase === "failed" ? "Try again" : "Claim with Face ID"}
            </button>
            <p className="sw-claim-under">
              {via?.kind === "classic"
                ? `Into your Stellar wallet, ${short(via.address)}. Sown's servers pay the network.`
                : "Your face or fingerprint makes a wallet that only you control. No app, no password, nothing to pay. Sown's servers pay the network."}
            </p>
            {via?.kind === "classic" && phase === "failed" ? (
              <button
                type="button"
                className="sw-textbtn sw-claim-alt"
                onClick={() => {
                  setVia(null);
                  setWhy(null);
                  setPhase("idle");
                }}
              >
                Claim with Face ID instead
              </button>
            ) : (
              <button type="button" className="sw-textbtn sw-claim-alt" onClick={openWallets} disabled={busy}>
                I already have a Stellar wallet
              </button>
            )}
          </>
        )}
        {why ? (
          <p className="sw-note is-warn">
            {why} {/still waiting|nothing moved/i.test(why) ? "" : "Nothing moved. Your envelope is still waiting."}
          </p>
        ) : null}
        <div className="sw-claim-facts">
          {asset ? <p>{asset.disclosure}</p> : null}
          <p>{returnWords(e)}</p>
          {testnet ? <p>This is testnet: the dollars are test USDC and the keep is test XLM, with no value.</p> : null}
        </div>
      </div>

      <WalletSheet
        open={sheet}
        onClose={() => setSheet(false)}
        onPick={(w) => void claimClassic(w)}
        passphrase={passphrase}
        title="Claim with a Stellar wallet"
        intro={`Approve once, the first time: Sown's servers prepare your wallet to hold USDC${asset && !asset.standIn ? ` and ${asset.ticker}` : ""}, and pay for it. Then the claim goes through by itself.`}
        why={sheet ? why : null}
      />
    </div>
  );
}

/**
 * THE GIFT: the envelope as the recipient sees it. Who sent it (the note's name if the ledger
 * vouches for it, else the address), the whole amount in their own money, the note, then the two
 * parts: to spend, and what stays theirs.
 */
function Gift({ e, total, asset, ticker, note, yours, fresh, claimTx, explorer }: { e: ReturnType<typeof envelopeFromJson>; total: bigint; asset: AssetView | null; ticker: string; note: Note | null; yours: boolean; fresh: boolean; claimTx: string | null; explorer: string }) {
  const money = useLocalMoney();
  const usdTotal = fromRaw(total);
  const state = e.state;
  const kicker = state === "claimed" ? (fresh ? "Claimed on Stellar, just now" : "Claimed on Stellar") : state === "returned" ? "Returned to the sender" : "Sent on Stellar, waiting for you";
  return (
    <article className={`sw-gift is-${state}${fresh ? " is-printing" : ""}`}>
      <div className="sw-gift-head">
        <span className="sw-gift-kicker">
          <span className="dot" aria-hidden />
          {kicker}
        </span>
        <span className="sw-gift-brand">
          <SownMark size={18} />
          Sown
        </span>
      </div>
      <div className="sw-gift-body">
        <p className="sw-gift-from">{note?.from ? `${note.from} sent you` : <><span className="mono">{short(e.sender)}</span> sent you</>}</p>
        <p className="sw-gift-amount">
          {money ? (
            <>
              <span className="big">{money.format(usdTotal)}</span>
              <span className="usd">{usdAligned(usdTotal)} in USDC</span>
            </>
          ) : (
            <span className="big">{usdAligned(usdTotal)}</span>
          )}
        </p>
        {note?.note ? <p className="sw-gift-note">“{note.note}”</p> : null}
        <div className="sw-gift-parts">
          <div className="part is-spend">
            <p className="k">
              <span className="dot" aria-hidden />
              {state === "claimed" ? "To spend" : "To spend, now"}
            </p>
            <p className="v">{usdAligned(fromRaw(e.cash))}</p>
            <p className="sub">{money ? money.format(fromRaw(e.cash)) : "dollars, as USDC"}</p>
          </div>
          <div className="part is-stay">
            <p className="k">
              <span className="dot" aria-hidden />
              {yours ? "Stays yours" : state === "returned" ? "Was kept as" : state === "claimed" ? "Kept as" : "Stays yours, when you claim"}
            </p>
            <p className="v">
              {units(e.keepOut)} <span className="sym">{ticker}</span>
            </p>
            <p className="sub">{asset ? (asset.standIn ? "XLM, standing in for US Treasuries on testnet" : asset.fullName) : ticker}</p>
          </div>
        </div>
        <p className="sw-gift-when">
          {state === "claimed" ? `Claimed ${stampUTC(e.claimedAt)}` : state === "returned" ? returnWords(e) : `Sent ${dateUTC(e.createdAt)}`}
          {state === "claimed" && yours ? " · in your wallet" : state === "claimed" && e.claimedBy ? <> · to <span className="mono">{short(e.claimedBy)}</span></> : null}
          {claimTx ? (
            <>
              {" · "}
              <a href={`${explorer}/tx/${claimTx}`} className="sw-link">
                on the ledger
              </a>
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}
