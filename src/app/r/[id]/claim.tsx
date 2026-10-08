"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Fingerprint, X } from "lucide-react";
import { Envelope } from "@/components/envelope/envelope";
import { LocalAmount } from "@/components/money/local-amount";
import { SkeletonEnvelope } from "@/components/skeleton/skeleton";
import { useTxToast } from "@/components/toast/use-tx-toast";
import { assetLine } from "@/lib/assets/catalogue";
import { decodeSecret, secretOpens, signClaim } from "@/lib/envelope/claim";
import { type EnvelopeJson, envelopeFromJson } from "@/lib/envelope/types";
import { returnWords } from "@/lib/envelope/view";
import { bps, dateUTC, fromRaw, short, stampUTC, units, usdAligned } from "@/lib/format";
import { rememberClaim, saveWallet, savedWallet } from "@/lib/local";
import { faceSupport, inAppBrowser, makeWallet } from "@/lib/passkey/client";
import { type WalletOption, connectWallet, isPhone, listWallets, signWith } from "@/lib/wallet/kit";

/**
 * THE CLAIM. One primary button, "Claim with Face ID": the phone makes a passkey (the one Face
 * ID), Sown's servers deploy the wallet and submit the claim the link signed. Or a Stellar
 * wallet: Sown's servers prepare it to hold these assets (one approval, the first time) and
 * submit the claim. The secret never leaves this page: only a signature naming the wallet does.
 */
type Read = { envelope: EnvelopeJson; claimTx: string | null } | { error: string; missing: boolean };
type AssetView = { ticker: string; name: string; fullName: string; issuerName: string; standIn: boolean; disclosure: string };
type Phase = "idle" | "making" | "preparing" | "approving" | "claiming" | "done" | "failed";

export function ClaimCard({ id, read, asset, passphrase, testnet, explorer, contractId }: { id: string; read: Read; asset: AssetView | null; passphrase: string; testnet: boolean; explorer: string; contractId: string }) {
  const [secret, setSecret] = useState<Uint8Array | null | undefined>(undefined);
  const [face, setFace] = useState<"yes" | "no" | "maybe" | null>(null);
  const [inApp, setInApp] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<EnvelopeJson | null>("envelope" in read ? read.envelope : null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [why, setWhy] = useState<string | null>(null);
  const [mine, setMine] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  const [claimTx, setClaimTx] = useState<string | null>("envelope" in read ? read.claimTx : null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setSecret(decodeSecret(window.location.hash));
    setInApp(inAppBrowser());
    setMine(savedWallet()?.contractId ?? null);
    void faceSupport().then(setFace);
  }, []);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (sheet && !d.open) d.showModal();
    else if (!sheet && d.open) d.close();
  }, [sheet]);

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
      const body = (await res.json()) as { ok: boolean; why?: string; claimTx?: string };
      if (!body.ok) {
        setPhase("failed");
        setWhy(body.why ?? "The claim did not go through.");
        return;
      }
      saveWallet({ contractId: made.value.contractId, credentialId: made.value.credentialId, at: Math.floor(Date.now() / 1000) });
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

  const openWallets = async () => {
    setWhy(null);
    setSheet(true);
    setWallets(await listWallets(passphrase));
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
      if (claimed.claimTx) setClaimTx(claimed.claimTx);
      await refresh();
      setPhase("done");
    } catch {
      setPhase("failed");
      setWhy("Could not reach Sown's servers. Nothing moved; your envelope is still waiting.");
    }
  };

  // ── claimed: the receipt, printing if it was claimed here and now ──
  if (e.state === "claimed") {
    const ours = mine && e.claimedBy === mine;
    return (
      <div className="sw-claim">
        <Envelope
          kicker={phase === "done" ? "Claimed on Stellar, just now" : "Claimed on Stellar"}
          tone="ok"
          sent={<>{short(e.sender)} sent <strong>{usdAligned(fromRaw(total))}</strong></>}
          became={`${bps(e.keepBps)} kept as`}
          units={units(e.keepOut)}
          symbol={ticker}
          assetLine={asset ? assetLine(asset) : undefined}
          when={phase === "done" ? "just now" : `Claimed ${stampUTC(e.claimedAt)}`}
          where={phase === "done" || ours ? "in your wallet" : <>to <span className="addr">{short(e.claimedBy ?? "")}</span></>}
          sections={[
            {
              rows: [
                { k: "To spend", v: <>{usdAligned(fromRaw(e.cash))}<LocalAmount usd={fromRaw(e.cash)} /></> },
                ...(claimTx ? [{ k: "Claim", v: <a href={`${explorer}/tx/${claimTx}`}>{short(claimTx)}</a> }] : []),
              ],
            },
          ]}
          printing={phase === "done"}
        />
        <div className="sw-claim-after">
          {phase === "done" || ours ? (
            <>
              <Link href="/mine" className="sw-btn is-primary is-block">
                Open your wallet
              </Link>
              <p className="sw-claim-under">
                {mine?.startsWith("C") && (phase === "done" || ours) ? "Your wallet opens with your face, on this phone." : "The dollars and the keep are in the wallet you chose."}{" "}
                <Link href={`/receipt/${id}`} className="sw-link">
                  The receipt
                </Link>
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
        <Envelope
          kicker="Returned"
          tone="returned"
          sent={<>{short(e.sender)} sent <strong>{usdAligned(fromRaw(total))}</strong></>}
          became={`${bps(e.keepBps)} was kept as`}
          units={units(e.keepOut)}
          symbol={ticker}
          when={returnWords(e)}
        />
        <div className="sw-claim-after">
          <p className="sw-claim-say">{returnWords(e)}</p>
          <p className="sw-claim-under">Ask them to send again. A new send makes a new link.</p>
        </div>
      </div>
    );
  }

  // ── open, but the link is missing its secret or it is the wrong one ──
  if (!secret || !opens) {
    return (
      <div className="sw-claim">
        <Waiting e={e} total={total} asset={asset} ticker={ticker} />
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
      <Waiting e={e} total={total} asset={asset} ticker={ticker} />
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
            <button type="button" className="sw-textbtn sw-claim-alt" onClick={() => void openWallets()} disabled={busy}>
              I already have a Stellar wallet
            </button>
          </>
        ) : (
          <>
            <button type="button" className="sw-btn is-primary is-block" onClick={() => void claimPasskey()} disabled={busy}>
              <Fingerprint size={18} strokeWidth={2} aria-hidden />
              {phase === "making" ? "Making your wallet…" : phase === "claiming" ? "Claiming…" : phase === "preparing" ? "Preparing your wallet…" : phase === "approving" ? "Approve in your wallet…" : phase === "failed" ? "Try again" : "Claim with Face ID"}
            </button>
            <p className="sw-claim-under">Your face or fingerprint makes a wallet that only you control. No app, no password, nothing to pay. Sown&apos;s servers pay the network.</p>
            <button type="button" className="sw-textbtn sw-claim-alt" onClick={() => void openWallets()} disabled={busy}>
              I already have a Stellar wallet
            </button>
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

      <dialog ref={dialog} className="sw-sheet" aria-label="Claim with a Stellar wallet" onClose={() => setSheet(false)} onCancel={() => setSheet(false)}>
        <div className="sw-sheet-head">
          <p className="sw-sheet-title">Claim with a Stellar wallet</p>
          <button type="button" className="sw-sheet-close" onClick={() => setSheet(false)} aria-label="Close">
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="sw-sheet-body">
          <p className="sw-sheet-say">
            Approve once, the first time: Sown&apos;s servers prepare your wallet to hold USDC{asset && !asset.standIn ? ` and ${asset.ticker}` : ""}, and pay for it. Then the claim goes through by itself.
          </p>
          {wallets === null ? (
            <p className="sw-sheet-say">Looking for Stellar wallets in this browser…</p>
          ) : (
            <div className="sw-wallets">
              {wallets.filter((w) => w.available).map((w) => (
                <button key={w.id} type="button" className="sw-wallet" onClick={() => void claimClassic(w)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {w.icon ? <img src={w.icon} alt="" width={22} height={22} /> : null}
                  {w.name}
                </button>
              ))}
              {wallets.filter((w) => !w.available).map((w) => (
                <a key={w.id} href={w.url} className="sw-wallet is-install" target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {w.icon ? <img src={w.icon} alt="" width={22} height={22} /> : null}
                  Get {w.name}
                </a>
              ))}
            </div>
          )}
          {wallets && wallets.every((w) => !w.available) ? (
            <p className="sw-sheet-fine">{isPhone() ? "No Stellar wallet is open in this browser. Open this link inside your wallet app's browser, or claim with Face ID." : "No Stellar wallet is installed in this browser."}</p>
          ) : null}
          {why ? <p className="sw-note is-warn">{why}</p> : null}
        </div>
      </dialog>
    </div>
  );
}

function Waiting({ e, total, asset, ticker }: { e: ReturnType<typeof envelopeFromJson>; total: bigint; asset: AssetView | null; ticker: string }) {
  return (
    <Envelope
      kicker="Sent, waiting for you"
      tone="waiting"
      sent={<><span className="addr">{short(e.sender)}</span> sent you <strong>{usdAligned(fromRaw(total))}</strong><LocalAmount usd={fromRaw(total)} /></>}
      became={e.keepIn > 0n ? "yours to keep when you claim" : "nothing kept"}
      units={units(e.keepOut)}
      symbol={ticker}
      assetLine={asset ? assetLine(asset) : undefined}
      where={<>{usdAligned(fromRaw(e.cash))} to spend<LocalAmount usd={fromRaw(e.cash)} /></>}
      when={`Sent ${dateUTC(e.createdAt)}`}
    />
  );
}
