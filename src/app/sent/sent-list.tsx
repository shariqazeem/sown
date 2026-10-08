"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { EnvelopeRow } from "@/components/envelope/envelope";
import { SkeletonRows } from "@/components/skeleton/skeleton";
import { useTxToast } from "@/components/toast/use-tx-toast";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { type EnvelopeJson, envelopeFromJson } from "@/lib/envelope/types";
import { bps, dateUTC, fromRaw, short, units, usdAligned } from "@/lib/format";
import { linkFor } from "@/lib/local";
import { type WalletOption, connectWallet, rememberWallet, rememberedWallet, signWith } from "@/lib/wallet/kit";
import "./sent.css";

type Phase = "idle" | "building" | "signing" | "confirming" | "done" | "failed";

export function SentList({ passphrase, tickers, explorer }: { passphrase: string; tickers: Record<string, string>; explorer: string }) {
  const [account, setAccount] = useState<{ id: string; address: string } | null | undefined>(undefined);
  const [rows, setRows] = useState<EnvelopeJson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [busyId, setBusyId] = useState<string | null>(null);
  useTxToast(phase, busyId ? `Take back envelope ${busyId}` : "Take it back", { detail: why ?? undefined });

  useEffect(() => setAccount(rememberedWallet()), []);

  const load = useCallback(async (address: string) => {
    setError(null);
    try {
      const r = await fetch(`/api/envelopes?by=${address}&role=sent`, { cache: "no-store" });
      const body = (await r.json()) as { envelopes?: EnvelopeJson[]; error?: string };
      if (!r.ok) {
        setError(body.error ?? "Your sends could not be read just now.");
        return;
      }
      setRows(body.envelopes ?? []);
    } catch {
      setError("Your sends could not be read just now. Nothing is lost; try again in a moment.");
    }
  }, []);

  useEffect(() => {
    if (account) void load(account.address);
  }, [account, load]);

  const pick = async (w: WalletOption) => {
    setWhy(null);
    const c = await connectWallet(passphrase, w.id);
    if (!c.ok) {
      if (c.why) setWhy(c.why);
      return;
    }
    const who = { id: w.id, address: c.value.address };
    rememberWallet(who);
    setAccount(who);
    setSheet(false);
  };

  const takeBack = async (id: string) => {
    if (!account) return;
    setWhy(null);
    setBusyId(id);
    setPhase("building");
    try {
      const prep = await fetch("/api/refund", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, by: account.address }) });
      const p = (await prep.json()) as { xdr?: string; error?: string };
      if (!prep.ok || !p.xdr) {
        setPhase("failed");
        setWhy(p.error ?? "It could not be prepared. Nothing moved.");
        return;
      }
      setPhase("signing");
      const signed = await signWith(passphrase, account.id, p.xdr, account.address);
      if (!signed.ok) {
        setPhase(signed.why ? "failed" : "idle");
        setWhy(signed.why || null);
        return;
      }
      setPhase("confirming");
      const sub = await fetch("/api/refund", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signedXdr: signed.value }) });
      const s = (await sub.json()) as { hash?: string; error?: string };
      if (!sub.ok) {
        setPhase("failed");
        setWhy(s.error ?? "It did not go through. Nothing moved.");
        return;
      }
      setPhase("done");
      await load(account.address);
    } catch {
      setPhase("failed");
      setWhy("Could not reach Sown. Nothing moved.");
    }
  };

  if (account === undefined) return <SkeletonRows rows={3} />;
  if (account === null) {
    return (
      <div className="sw-sent-door">
        <p className="sw-body">Connect the Stellar wallet you send from. Connecting moves nothing.</p>
        <button type="button" className="sw-btn is-primary" onClick={() => setSheet(true)}>
          Connect your wallet
        </button>
        <WalletSheet open={sheet} onClose={() => setSheet(false)} onPick={(w) => void pick(w)} passphrase={passphrase} why={why} />
      </div>
    );
  }

  return (
    <div className="sw-sent">
      <p className="sw-sent-who">
        From <span className="mono">{short(account.address)}</span>.{" "}
        <button
          type="button"
          className="sw-textbtn"
          onClick={() => {
            rememberWallet(null);
            setAccount(null);
            setRows(null);
          }}
        >
          Use another wallet
        </button>
      </p>
      {why && phase === "failed" ? <p className="sw-note is-warn">{why}</p> : null}
      {error ? <p className="sw-note is-warn">{error}</p> : null}
      {rows === null && !error ? <SkeletonRows rows={4} /> : null}
      {rows && rows.length === 0 ? (
        <p className="sw-note">
          Nothing sent from this wallet yet.{" "}
          <Link href="/#send" className="sw-link">
            Send something on the front page.
          </Link>
        </p>
      ) : null}
      {rows && rows.length > 0 ? (
        <div className="sw-sent-rows">
          {rows.map((j) => {
            const e = envelopeFromJson(j);
            const id = e.id.toString();
            const state = e.state === "open" ? "waiting" : e.state;
            const secret = e.state === "open" ? linkFor(e.claimKeyHex) : null;
            const link = secret ? `${typeof window === "undefined" ? "" : window.location.origin}/r/${id}#${secret}` : null;
            const ticker = tickers[e.keepAsset] ?? "units";
            return (
              <EnvelopeRow
                key={id}
                href={`/receipt/${id}`}
                state={state}
                amount={usdAligned(fromRaw(e.cash + e.keepIn))}
                keep={e.keepIn > 0n ? `${bps(e.keepBps)} kept as ${units(e.keepOut)} ${ticker}` : "nothing kept"}
                date={dateUTC(e.createdAt)}
                note={
                  e.state === "open" ? (
                    <div className="sw-sent-actions">
                      {link ? (
                        open === id ? (
                          <div className="sw-sent-share">
                            <span className="mono">{link}</span>
                            <div className="sw-actions">
                              <button type="button" className="sw-btn" onClick={() => void navigator.clipboard?.writeText(link)}>
                                <Copy size={16} strokeWidth={2} aria-hidden />
                                Copy
                              </button>
                              <a className="sw-btn" href={`https://wa.me/?text=${encodeURIComponent(`Open this to claim what I sent you: ${link}`)}`} target="_blank" rel="noreferrer">
                                Share on WhatsApp
                              </a>
                            </div>
                            <span className="fine">Anyone with this link can claim it. Send it only to them.</span>
                          </div>
                        ) : (
                          <button type="button" className="sw-textbtn" onClick={() => setOpen(id)}>
                            Share the link again
                          </button>
                        )
                      ) : (
                        <span>The link was made in another browser. Take this back and send again.</span>
                      )}
                      <button type="button" className="sw-textbtn" disabled={phase === "building" || phase === "signing" || phase === "confirming"} onClick={() => void takeBack(id)}>
                        {busyId === id && phase === "signing" ? "Approve in your wallet…" : busyId === id && phase === "confirming" ? "Taking it back…" : busyId === id && phase === "building" ? "Preparing…" : "Take it back"}
                      </button>
                    </div>
                  ) : e.state === "returned" ? (
                    <span>Returned {dateUTC(e.claimedAt)}.</span>
                  ) : (
                    <span>
                      Claimed {dateUTC(e.claimedAt)} by <a href={`${explorer}/${e.claimedBy?.startsWith("C") ? "contract" : "account"}/${e.claimedBy}`}>{short(e.claimedBy ?? "")}</a>.
                    </span>
                  )
                }
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
