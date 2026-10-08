"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Fingerprint } from "lucide-react";
import { StrKey } from "@stellar/stellar-sdk";
import { EnvelopeRow } from "@/components/envelope/envelope";
import { LocalAmount } from "@/components/money/local-amount";
import type { HoldingsBody } from "@/components/send/types";
import { SkeletonRows } from "@/components/skeleton/skeleton";
import { useTxToast } from "@/components/toast/use-tx-toast";
import { type EnvelopeJson, envelopeFromJson } from "@/lib/envelope/types";
import { bps, dateUTC, fromRaw, short, stampUTC, units, usdAligned } from "@/lib/format";
import { readJson, saveWallet, savedWallet, writeJson } from "@/lib/local";
import { connectSaved, findWallet, moveOut } from "@/lib/passkey/client";
import "./mine.css";

/**
 * YOUR WALLET. It lives behind the recipient's face: this page reads what the wallet holds from
 * the chain, lists the envelopes it claimed, moves money out with one Face ID, and links the
 * wallets that turn USDC into cash. No seed phrase anywhere. Offline, it shows the last answer
 * this browser received and says when that was.
 */
type AssetRow = { key: string; sac: string; ticker: string; name: string; issuerName: string; standIn: boolean; line: string; code: string; issuer: string | null };
type Cached = { holdings: HoldingsBody; envelopes: EnvelopeJson[]; at: number };
type MovePhase = "idle" | "building" | "signing" | "confirming" | "done" | "failed";

const CASH_OUT = [
  { name: "Vesseo", href: "https://vesseoapp.com", what: "a USDC wallet with MoneyGram cash in and out" },
  { name: "LOBSTR", href: "https://lobstr.co", what: "a Stellar wallet with cash out through anchors" },
  { name: "Decaf", href: "https://www.decaf.so", what: "a wallet with MoneyGram cash out in 180+ countries" },
  { name: "The anchor directory", href: "https://anchors.stellar.org", what: "every service that turns Stellar dollars into local money" },
] as const;

export function Mine({ usdcSac, assets, explorer, testnet }: { usdcSac: string; assets: AssetRow[]; explorer: string; testnet: boolean }) {
  const [wallet, setWallet] = useState<{ contractId: string; credentialId: string } | null | undefined>(undefined);
  const [data, setData] = useState<Cached | null>(null);
  const [stale, setStale] = useState<number | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [finding, setFinding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [to, setTo] = useState("");
  const [what, setWhat] = useState<string>(usdcSac);
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<MovePhase>("idle");
  const [moveWhy, setMoveWhy] = useState<string | null>(null);
  const [moved, setMoved] = useState<string | null>(null);
  useTxToast(phase, "Move", { detail: moveWhy ?? undefined });

  useEffect(() => setWallet(savedWallet()), []);

  const load = useCallback(async (address: string) => {
    const cached = readJson<Cached>(`mine:${address}`);
    if (cached) setData(cached);
    try {
      const [h, e] = await Promise.all([
        fetch(`/api/holdings/${address}`, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<HoldingsBody>) : Promise.reject(new Error("holdings")))),
        fetch(`/api/envelopes?by=${address}&role=claimed`, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<{ envelopes: EnvelopeJson[] }>) : Promise.reject(new Error("envelopes")))),
      ]);
      const next = { holdings: h, envelopes: e.envelopes, at: Math.floor(Date.now() / 1000) };
      setData(next);
      setStale(null);
      writeJson(`mine:${address}`, next);
    } catch {
      setStale(cached?.at ?? 0);
    }
  }, []);

  useEffect(() => {
    if (wallet) void load(wallet.contractId);
  }, [wallet, load]);

  const find = async () => {
    setWhy(null);
    setFinding(true);
    const r = await findWallet();
    setFinding(false);
    if (!r.ok) {
      if (r.why) setWhy(r.why);
      return;
    }
    saveWallet({ ...r.value, at: Math.floor(Date.now() / 1000) });
    setWallet(r.value);
  };

  const move = async () => {
    if (!wallet) return;
    setMoveWhy(null);
    setMoved(null);
    const n = Number(amount);
    if (!StrKey.isValidEd25519PublicKey(to.trim()) && !StrKey.isValidContract(to.trim())) {
      setMoveWhy("That is not a Stellar address. It starts with G and is 56 characters long.");
      return;
    }
    if (!(n > 0)) {
      setMoveWhy("Choose an amount above zero.");
      return;
    }
    const row = what === usdcSac ? null : assets.find((a) => a.sac === what);
    // A classic wallet needs a trustline for an issued asset before it can receive it.
    if (StrKey.isValidEd25519PublicKey(to.trim()) && (what === usdcSac || row?.issuer)) {
      const h = await fetch(`/api/holdings/${to.trim()}`).then((r) => (r.ok ? (r.json() as Promise<HoldingsBody>) : null));
      const trusted = what === usdcSac ? h?.usdc.trusted : h?.keeps.find((k) => k.key === row?.key)?.trusted;
      if (h && trusted === false) {
        setMoveWhy(`That wallet cannot hold ${what === usdcSac ? "USDC" : `${row?.ticker} (${row?.issuerName})`} yet. Open it and add ${what === usdcSac ? "USDC" : row?.ticker} first.`);
        return;
      }
    }
    setPhase("building");
    const c = await connectSaved(wallet.credentialId, wallet.contractId);
    if (!c.ok) {
      setPhase(c.why ? "failed" : "idle");
      setMoveWhy(c.why || null);
      return;
    }
    setPhase("signing");
    const r = await moveOut(what, to.trim(), n);
    if (!r.ok) {
      setPhase(r.why ? "failed" : "idle");
      setMoveWhy(r.why || null);
      return;
    }
    setPhase("done");
    setMoved(r.value);
    setAmount("");
    void load(wallet.contractId);
  };

  if (wallet === undefined) return <SkeletonRows rows={4} />;

  if (wallet === null) {
    return (
      <div className="sw-mine-door">
        <p className="sw-kicker">Your wallet</p>
        <h1 className="sw-h1">Your wallet lives behind your face.</h1>
        <p className="sw-lede">If you claimed an envelope with Face ID, your wallet opens with the same face or fingerprint.</p>
        <button type="button" className="sw-btn is-primary" onClick={() => void find()} disabled={finding}>
          <Fingerprint size={18} strokeWidth={2} aria-hidden />
          {finding ? "Looking for your wallet…" : "Continue with Face ID"}
        </button>
        {why ? <p className="sw-note is-warn">{why}</p> : null}
        <p className="sw-body">Claimed on another phone? Your wallet is found by the same face or fingerprint, which your phone keeps in sync. Nothing here needs a password.</p>
      </div>
    );
  }

  const h = data?.holdings;
  const usdc = h ? BigInt(h.usdc.balanceRaw) : null;
  return (
    <div className="sw-mine">
      <div className="sw-mine-head">
        <p className="sw-kicker">Your wallet</p>
        <h1 className="sw-h1">What you hold</h1>
        <p className="sw-mine-addr">
          <span className="mono">{short(wallet.contractId, 6, 6)}</span>
          <button
            type="button"
            className="sw-textbtn"
            onClick={() => {
              void navigator.clipboard?.writeText(wallet.contractId).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2_000);
              });
            }}
          >
            {copied ? <Check size={14} strokeWidth={2} aria-hidden /> : <Copy size={14} strokeWidth={2} aria-hidden />} {copied ? "Copied" : "Copy the address"}
          </button>
        </p>
        {stale !== null ? <p className="sw-note is-warn">Offline. Showing what this phone last read{stale ? ` on ${stampUTC(stale)}` : ""}.</p> : null}
      </div>

      <div className="sw-mine-holds">
        {!h ? (
          <SkeletonRows rows={2} />
        ) : (
          <>
            <div className="sw-hold">
              <p className="what">Dollars to spend</p>
              <p className="amount">
                {usdAligned(fromRaw(h.usdc.balanceRaw))}
                <LocalAmount usd={fromRaw(h.usdc.balanceRaw)} prefix="" />
              </p>
              <p className="line">USDC{testnet ? ", test dollars with no value" : ", issued by Circle"}</p>
            </div>
            {h.keeps.map((k) => {
              const row = assets.find((a) => a.key === k.key);
              const bal = BigInt(k.balanceRaw);
              if (bal === 0n && !row) return null;
              return (
                <div key={k.key} className="sw-hold">
                  <p className="what">{row?.standIn ? "Kept, as the testnet stand-in" : `Kept as ${k.name}`}</p>
                  <p className="amount">
                    {units(k.balanceRaw)} <span className="sym">{k.ticker}</span>
                  </p>
                  <p className="value">
                    {k.valueUsdcRaw ? (
                      <>
                        ≈ {usdAligned(fromRaw(k.valueUsdcRaw))}
                        <LocalAmount usd={fromRaw(k.valueUsdcRaw)} />, worth at Aquarius&apos;s price right now
                      </>
                    ) : bal > 0n ? (
                      "Aquarius did not price it just now."
                    ) : (
                      "None yet."
                    )}
                  </p>
                  <p className="line">{row?.line}</p>
                </div>
              );
            })}
          </>
        )}
      </div>

      <section className="sw-mine-sec">
        <h2 className="sw-h2">Your envelopes</h2>
        {!data ? (
          <SkeletonRows rows={2} />
        ) : data.envelopes.length === 0 ? (
          <p className="sw-body">No envelope has been claimed into this wallet yet.</p>
        ) : (
          <div>
            {data.envelopes.map((j) => {
              const e = envelopeFromJson(j);
              const t = assets.find((a) => a.sac === e.keepAsset)?.ticker ?? "units";
              return (
                <EnvelopeRow
                  key={e.id.toString()}
                  href={`/receipt/${e.id}`}
                  state="claimed"
                  amount={usdAligned(fromRaw(e.cash + e.keepIn))}
                  keep={e.keepIn > 0n ? `${bps(e.keepBps)} kept as ${units(e.keepOut)} ${t}` : "nothing kept"}
                  date={dateUTC(e.claimedAt)}
                  note={<span>From {short(e.sender)}.</span>}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="sw-mine-sec">
        <h2 className="sw-h2">Move to a wallet</h2>
        <p className="sw-body">Send what you hold to any Stellar address: your own LOBSTR or Vesseo wallet, or someone else&apos;s. Your face approves it. Sown&apos;s servers pay the network.</p>
        <div className="sw-move">
          <label className="sw-field">
            <span>To</span>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="G… or C…" spellCheck={false} autoComplete="off" />
          </label>
          <div className="sw-move-row">
            <label className="sw-field">
              <span>What</span>
              <select value={what} onChange={(e) => setWhat(e.target.value)}>
                <option value={usdcSac}>Dollars (USDC)</option>
                {assets.map((a) => (
                  <option key={a.sac} value={a.sac}>
                    {a.standIn ? "XLM (testnet stand-in)" : `${a.name} (${a.ticker})`}
                  </option>
                ))}
              </select>
            </label>
            <label className="sw-field">
              <span>How much</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").slice(0, 16))} inputMode="decimal" placeholder={what === usdcSac && usdc !== null ? fromRaw(usdc).toFixed(2) : "0.00"} />
            </label>
          </div>
          <button type="button" className="sw-btn is-block" onClick={() => void move()} disabled={phase === "building" || phase === "signing" || phase === "confirming"}>
            {phase === "building" ? "Opening your wallet…" : phase === "signing" ? "Approve with your face…" : "Move"}
          </button>
          {moveWhy ? <p className="sw-note is-warn">{moveWhy}</p> : null}
          {moved ? (
            <p className="sw-note is-ok">
              Moved.{" "}
              <a className="sw-link" href={`${explorer}/tx/${moved}`}>
                The transaction
              </a>
            </p>
          ) : null}
        </div>
      </section>

      <section className="sw-mine-sec">
        <h2 className="sw-h2">Cash out</h2>
        <p className="sw-body">Sown does not move cash. These wallets connect to MoneyGram and local banks on Stellar: move your dollars to one, then cash out there.</p>
        <ul className="sw-cashout">
          {CASH_OUT.map((c) => (
            <li key={c.name}>
              <a href={c.href} target="_blank" rel="noreferrer" className="sw-link">
                {c.name}
              </a>{" "}
              <span>{c.what}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="sw-mine-note">
        This wallet is yours: it opens with your face on this phone. To use it on another phone, open Sown there and continue with the same face or fingerprint.{" "}
        <Link href="/docs/the-envelope" className="sw-link">
          How it works
        </Link>
      </p>
    </div>
  );
}
