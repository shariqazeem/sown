"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, ShieldCheck, X } from "lucide-react";
import { useLocalMoney } from "@/components/money/use-local-money";
import { useTxToast } from "@/components/toast/use-tx-toast";
import { claimKey, encodeSecret, newSecret } from "@/lib/envelope/claim";
import { NOTE_LIMITS, type Note, cleanNote, encodeNote, noteHashHex } from "@/lib/envelope/note";
import { dateUTC, fromRaw, units, usd, usdAligned, xlm } from "@/lib/format";
import { saveLink, writeJson } from "@/lib/local";
import { type WalletOption, connectWallet, isPhone, listWallets, rememberWallet, rememberedWallet, signWith } from "@/lib/wallet/kit";
import { parsePrefill } from "./prefill";
import type { CardAsset, HoldingsBody, PreparedBody, Quote, RecordedBody } from "./types";
import "./send.css";

/**
 * THE SEND CARD — the front door's one job.
 *
 * How much, keep how much, and the split drawn live from the pool's own answer: what they get
 * to spend, and what stays as theirs. A name and a note can ride with the link (their hash goes
 * on the ledger). One button that says exactly what it does. Nothing opens the wallet until the
 * confirm sheet has said, in words, what moves, what it becomes, the least it can become, the
 * fee from the transaction's own simulation, when it comes back by itself, and what the issuer
 * can do.
 */
const AMOUNTS = [25, 50, 100] as const;
const KEEPS = [500, 1_000, 2_000] as const;
const RETURN_DAYS = 30;
const TEST_WALLET_ID = "sown-test-wallet";

type Props = {
  readonly assets: readonly CardAsset[];
  readonly initialQuote: Quote | null;
  readonly passphrase: string;
  readonly testnet: boolean;
  readonly xlmUsd: number | null;
  readonly deployed: boolean;
  readonly testWallet?: boolean;
};

type Phase = "idle" | "building" | "signing" | "confirming" | "failed";
type Prepared = PreparedBody & { readonly secret: string; readonly claimKeyHex: string; readonly at: number; readonly for: string };

export function SendCard({ assets, initialQuote, passphrase, testnet, xlmUsd, deployed, testWallet = false }: Props) {
  const router = useRouter();
  const money = useLocalMoney();
  const [amount, setAmount] = useState<{ usd: number; source: "chip" | "other" }>({ usd: 100, source: "chip" });
  const [otherAmount, setOtherAmount] = useState("");
  const [keepBps, setKeepBps] = useState<number>(1_000);
  const [keepSource, setKeepSource] = useState<"chip" | "other">("chip");
  const [otherKeep, setOtherKeep] = useState("");
  const [assetKey, setAssetKey] = useState(assets[0]?.key ?? "");
  const [from, setFrom] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(initialQuote);
  const [quoting, setQuoting] = useState(false);
  const [quoteWhy, setQuoteWhy] = useState<string | null>(null);
  const [account, setAccount] = useState<{ id: string; address: string } | null>(null);
  const [holdings, setHoldings] = useState<HoldingsBody | null>(null);
  const [wallets, setWallets] = useState<WalletOption[] | null>(null);
  const [sheet, setSheet] = useState<"wallets" | "confirm" | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [why, setWhy] = useState<string | null>(null);
  const [trying, setTrying] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  const asset = useMemo(() => assets.find((a) => a.key === assetKey) ?? assets[0]!, [assets, assetKey]);
  const amountRaw = BigInt(Math.round(amount.usd * 100)) * 100_000n;
  const usdLabel = usd(amount.usd);
  const intent = `${assetKey}:${amountRaw}:${keepBps}`;
  const note: Note | null = cleanNote({ from, note: noteText });
  const memoHex = noteHashHex(note);
  const prepareFor = `${intent}:${memoHex}`;
  // A quote counts only for the asset, amount and keep on screen; a stale one is never shown.
  const fresh = quote && quote.asset === asset.sac && quote.amountRaw === amountRaw.toString() && quote.keepBps === keepBps ? quote : null;
  const spendable = holdings ? BigInt(holdings.usdc.balanceRaw) : null;
  const fits = spendable === null || amountRaw <= spendable;
  const busy = phase === "building" || phase === "signing" || phase === "confirming";

  useTxToast(phase === "idle" ? "idle" : phase === "failed" ? "failed" : phase, `Send ${usdLabel}`, { detail: why ?? undefined });

  // A wallet this browser connected before: show it, and read what it holds.
  useEffect(() => {
    const r = rememberedWallet();
    if (r) setAccount(r);
  }, []);

  // A plan's reminder opens the card prefilled: /?usd=50&keep=1000&asset=usdy#send.
  useEffect(() => {
    const pre = parsePrefill(window.location.search, assets.map((x) => x.key));
    if (pre.usd !== undefined) {
      const chip = (AMOUNTS as readonly number[]).includes(pre.usd);
      setAmount({ usd: pre.usd, source: chip ? "chip" : "other" });
      if (!chip) setOtherAmount(String(pre.usd));
    }
    if (pre.keepBps !== undefined) {
      setKeepBps(pre.keepBps);
      const chip = (KEEPS as readonly number[]).includes(pre.keepBps);
      setKeepSource(chip ? "chip" : "other");
      if (!chip) setOtherKeep(String(pre.keepBps / 100));
    }
    if (pre.asset) setAssetKey(pre.asset);
  }, [assets]);
  useEffect(() => {
    if (!account) {
      setHoldings(null);
      return;
    }
    let live = true;
    fetch(`/api/holdings/${account.address}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<HoldingsBody>) : null))
      .then((h) => live && setHoldings(h))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [account]);

  // The live quote: what this slice becomes in this asset, from the pool, now.
  useEffect(() => {
    if (!deployed) return;
    if (amount.usd < 1 || amount.usd > 10_000) {
      setQuote(null);
      setQuoteWhy(amount.usd > 10_000 ? "Sown sends up to $10,000 at a time." : "The least a send can be is $1.");
      return;
    }
    if (fresh) {
      setQuoteWhy(null);
      return;
    }
    let live = true;
    setQuoting(true);
    const t = setTimeout(() => {
      fetch(`/api/quote?asset=${assetKey}&usd=${amount.usd}&keep=${keepBps}`, { cache: "no-store" })
        .then(async (r) => ({ ok: r.ok, body: (await r.json()) as Quote & { error?: string } }))
        .then(({ ok, body }) => {
          if (!live) return;
          if (ok) {
            setQuote(body);
            setQuoteWhy(null);
          } else {
            setQuote(null);
            setQuoteWhy(body.error ?? "Aquarius did not answer. Try again in a moment.");
          }
        })
        .catch(() => live && setQuoteWhy("Aquarius did not answer. Try again in a moment."))
        .finally(() => live && setQuoting(false));
    }, 280);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, deployed]);

  // The sheet is a native dialog: focus is held, Escape closes it.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (sheet && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>(".sw-sheet-title")?.focus();
      d.scrollTop = 0;
    } else if (!sheet && d.open) d.close();
  }, [sheet]);

  const prepare = useCallback(
    async (who: { id: string; address: string }, q: Quote) => {
      setWhy(null);
      setPhase("building");
      setPrepared(null);
      const secret = newSecret();
      const keyHex = claimKey(secret).toString("hex");
      try {
        const res = await fetch("/api/send/prepare", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sender: who.address, usd: String(amount.usd), keepBps, asset: assetKey, minKeepOut: q.minKeepOutRaw, claimKey: keyHex, returnDays: RETURN_DAYS, memo: memoHex }),
        });
        const body = (await res.json()) as PreparedBody & { error?: string };
        if (!res.ok) {
          setPhase("failed");
          setWhy(body.error ?? "The send could not be prepared. Nothing moved.");
          return;
        }
        setPrepared({ ...body, secret: encodeSecret(secret), claimKeyHex: keyHex, at: Date.now(), for: prepareFor });
        setPhase("idle");
      } catch {
        setPhase("failed");
        setWhy("Could not reach Sown. Nothing moved.");
      }
    },
    [amount.usd, keepBps, assetKey, memoHex, prepareFor],
  );

  const openConfirm = (who: { id: string; address: string }) => {
    setSheet("confirm");
    if (fresh) void prepare(who, fresh);
  };

  const startSend = async () => {
    setWhy(null);
    setPhase("idle");
    if (account) {
      openConfirm(account);
      return;
    }
    setSheet("wallets");
    setWallets(await listWallets(passphrase));
  };

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
    openConfirm(who);
  };

  /** Testnet: a wallet held in this browser that funds itself, so anyone can try a send. */
  const tryIt = async () => {
    setWhy(null);
    setTrying(true);
    try {
      await listWallets(passphrase);
      await pick({ id: TEST_WALLET_ID, name: "Test wallet", icon: "", url: "", available: true });
    } finally {
      setTrying(false);
    }
  };

  const approve = async () => {
    if (!account || !prepared || !fresh) return;
    if (prepared.for !== prepareFor || Date.now() - prepared.at > 240_000) {
      await prepare(account, fresh);
      return;
    }
    setWhy(null);
    // The link exists before the wallet is asked: a send that lands always has its link here.
    saveLink(prepared.claimKeyHex, prepared.secret, encodeNote(note));
    setPhase("signing");
    const signed = await signWith(passphrase, account.id, prepared.xdr, account.address);
    if (!signed.ok) {
      setPhase(signed.why ? "failed" : "idle");
      setWhy(signed.why || null);
      return;
    }
    setPhase("confirming");
    try {
      const res = await fetch("/api/send/record", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signedXdr: signed.value }) });
      const body = (await res.json()) as RecordedBody & { error?: string };
      if (!res.ok) {
        setPhase("failed");
        setWhy(`${body.error ?? "The send did not land."}`);
        setPrepared(null);
        return;
      }
      try {
        navigator.vibrate?.(24);
      } catch {
        // No haptics here.
      }
      // The plan copies the last send.
      writeJson("last-send", { usd: amount.usd, keepBps, asset: assetKey, at: Math.floor(Date.now() / 1000) });
      router.push(`/receipt/${body.id}?sent=1`);
    } catch {
      setPhase("failed");
      setWhy("Could not reach Sown to send it. If your wallet shows it sent, open Your sends.");
    }
  };

  const chooseAmount = (v: number, source: "chip" | "other") => {
    setAmount({ usd: v, source });
    if (phase === "failed") setPhase("idle");
  };

  const keepIn = fresh ? BigInt(fresh.keepInRaw) : (amountRaw * BigInt(keepBps)) / 10_000n;
  const cashRaw = amountRaw - keepIn;
  const unitsOut = fresh && fresh.keepOutRaw !== "0" ? units(fresh.keepOutRaw) : null;
  const leastOut = fresh && fresh.minKeepOutRaw !== "0" ? units(fresh.minKeepOutRaw) : null;
  const returnsOn = dateUTC(Math.floor(Date.now() / 1000) + RETURN_DAYS * 86_400);
  const feeStroops = prepared ? Number(prepared.feeStroops) : null;
  const feeMoney = feeStroops !== null && xlmUsd ? feeInMoney(feeStroops, xlmUsd) : null;
  const spendPct = Math.max(0, 100 - keepBps / 100);
  const keepPct = keepBps / 100;

  return (
    <div className="sw-send" id="send">
      <div className="sw-send-head">
        <p className="sw-send-title">Send home</p>
        <p className="sw-send-sub">{testnet ? "Test dollars on Stellar testnet" : "Dollars on Stellar, one approval"}</p>
      </div>

      <fieldset className="sw-send-group">
        <legend>How much</legend>
        <div className="sw-send-chips">
          {AMOUNTS.map((v) => {
            const can = spendable === null || BigInt(v) * 10_000_000n <= spendable;
            const on = amount.source === "chip" && amount.usd === v;
            return (
              <button key={v} type="button" className={`sw-send-chip${on ? " is-selected" : ""}`} aria-pressed={on} disabled={!can || busy} onClick={() => chooseAmount(v, "chip")}>
                ${v}
              </button>
            );
          })}
          <label className={`sw-send-chip is-other${amount.source === "other" ? " is-selected" : ""}`}>
            <span aria-hidden>$</span>
            <input
              inputMode="decimal"
              placeholder="Other"
              aria-label="Another amount in dollars"
              value={otherAmount}
              disabled={busy}
              onChange={(e) => {
                const t = e.target.value.replace(/[^0-9.]/g, "").slice(0, 8);
                setOtherAmount(t);
                const n = Number(t);
                if (Number.isFinite(n) && n >= 1) chooseAmount(Math.round(n * 100) / 100, "other");
              }}
            />
          </label>
        </div>
        {holdings ? (
          <p className={`sw-send-held${fits ? "" : " is-short"}`}>
            {holdings.usdc.trusted === false
              ? "This wallet cannot hold USDC yet. Add USDC to it in your wallet first."
              : spendable !== null && spendable < 10_000_000n
                ? `This wallet holds ${usdAligned(fromRaw(holdings.usdc.balanceRaw))} of USDC. Add USDC to it, then come back.`
                : fits
                  ? `This wallet holds ${usdAligned(fromRaw(holdings.usdc.balanceRaw))} of USDC.`
                  : `This wallet holds ${usdAligned(fromRaw(holdings.usdc.balanceRaw))} of USDC, less than ${usdLabel}. Choose a smaller amount.`}
          </p>
        ) : account ? (
          <p className="sw-send-held is-reading">Reading what this wallet holds…</p>
        ) : null}
      </fieldset>

      <fieldset className="sw-send-group">
        <legend>They keep</legend>
        <div className="sw-send-chips">
          {KEEPS.map((b) => {
            const on = keepSource === "chip" && keepBps === b;
            return (
              <button
                key={b}
                type="button"
                className={`sw-send-chip is-keep${on ? " is-selected" : ""}`}
                aria-pressed={on}
                disabled={busy}
                onClick={() => {
                  setKeepBps(b);
                  setKeepSource("chip");
                }}
              >
                {b / 100}%
              </button>
            );
          })}
          <label className={`sw-send-chip is-other is-keep${keepSource === "other" ? " is-selected" : ""}`}>
            <input
              inputMode="numeric"
              placeholder="Other"
              aria-label="Another keep, in percent"
              value={otherKeep}
              disabled={busy}
              onChange={(e) => {
                const t = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                setOtherKeep(t);
                const n = Number(t);
                if (Number.isInteger(n) && n >= 1 && n <= 100) {
                  setKeepBps(n * 100);
                  setKeepSource("other");
                }
              }}
            />
            <span aria-hidden>%</span>
          </label>
        </div>
      </fieldset>

      {/* THE SPLIT: what moves, drawn from the pool's own answer. */}
      <div className="sw-split" aria-live="polite">
        <div className="sw-split-bar" role="img" aria-label={`${spendPct}% to spend, ${keepPct}% stays`}>
          <span className="spend" style={{ flexGrow: spendPct }} />
          <span className="stay" style={{ flexGrow: keepPct }} />
        </div>
        <div className="sw-split-legend">
          <p className="spend">
            <span className="k">
              <span className="dot" aria-hidden />
              To spend
            </span>
            <span className="v">{usdAligned(fromRaw(cashRaw))}</span>
            <span className="sub">{money ? money.format(fromRaw(cashRaw)) : "dollars, as USDC"}</span>
          </p>
          <p className="stay">
            <span className="k">
              <span className="dot" aria-hidden />
              Stays theirs
            </span>
            <span className="v">
              {quoteWhy ? (
                <span className="why">{quoteWhy}</span>
              ) : unitsOut ? (
                <>
                  {unitsOut} <span className="sym">{asset.ticker}</span>
                </>
              ) : fresh ? (
                "nothing kept"
              ) : (
                <span className="why">{quoting ? "Asking Aquarius for the price…" : "—"}</span>
              )}
            </span>
            <span className="sub">
              {usdAligned(fromRaw(keepIn))} of {asset.standIn ? "XLM, standing in for US Treasuries on testnet" : asset.fullName}
            </span>
          </p>
        </div>
      </div>

      {assets.length > 1 ? (
        <fieldset className="sw-send-group">
          <legend>Kept as</legend>
          <div className="sw-send-chips">
            {assets.map((a) => (
              <button key={a.key} type="button" className={`sw-send-chip${a.key === assetKey ? " is-selected" : ""}`} aria-pressed={a.key === assetKey} disabled={busy} onClick={() => setAssetKey(a.key)}>
                {a.name}
              </button>
            ))}
          </div>
          <p className="sw-send-small">
            {asset.ticker} · issued by {asset.issuerName}
          </p>
        </fieldset>
      ) : null}

      <div className={`sw-send-note${noteOpen ? " is-open" : ""}`}>
        {noteOpen ? (
          <div className="sw-send-note-fields">
            <label className="sw-field">
              <span>Your name</span>
              <input value={from} maxLength={NOTE_LIMITS.from} placeholder="So they know who it is from" disabled={busy} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="sw-field">
              <span>A note for them</span>
              <input value={noteText} maxLength={NOTE_LIMITS.note} placeholder="For school fees, with love" disabled={busy} onChange={(e) => setNoteText(e.target.value)} />
            </label>
            <p className="sw-send-small">Travels inside the link, never through our servers. The send seals it on the ledger, so it cannot be changed.</p>
          </div>
        ) : (
          <button type="button" className="sw-send-note-btn" onClick={() => setNoteOpen(true)} disabled={busy}>
            <PenLine size={16} strokeWidth={2} aria-hidden />
            Add your name and a note
          </button>
        )}
      </div>

      <button type="button" className="sw-btn is-primary is-block sw-send-go" onClick={() => void startSend()} disabled={!deployed || busy || !fresh || !fits || !!quoteWhy}>
        Send {usdLabel}
      </button>
      <p className="sw-send-under">
        {account ? (
          <>
            From <span className="mono">{account.address.slice(0, 4)}…{account.address.slice(-4)}</span>.{" "}
            <button
              type="button"
              className="sw-textbtn"
              onClick={() => {
                rememberWallet(null);
                setAccount(null);
              }}
            >
              Use another wallet
            </button>
          </>
        ) : (
          <>
            Uses the Stellar wallet you already have. Nothing moves until you approve it.
            {testWallet ? (
              <>
                {" "}
                No wallet?{" "}
                <button type="button" className="sw-textbtn" onClick={() => void tryIt()} disabled={trying || busy}>
                  {trying ? "Making a test wallet…" : "Try it with a test wallet"}
                </button>{" "}
                that funds itself with test dollars.
              </>
            ) : null}
          </>
        )}
      </p>
      {why && !sheet ? <p className="sw-note is-warn">{why}</p> : null}

      <dialog
        ref={dialog}
        className="sw-sheet"
        aria-label={sheet === "wallets" ? "Choose a wallet" : `Send ${usdLabel}`}
        onClose={() => !busy && setSheet(null)}
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setSheet(null);
        }}
      >
        <div className="sw-sheet-head">
          <p className="sw-sheet-title" tabIndex={-1}>
            {sheet === "wallets" ? "Choose your wallet" : `Send ${usdLabel}`}
          </p>
          <button type="button" className="sw-sheet-close" onClick={() => setSheet(null)} aria-label="Close" disabled={busy}>
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {sheet === "wallets" ? (
          <WalletChoice wallets={wallets} why={why} onPick={(w) => void pick(w)} />
        ) : sheet === "confirm" && account ? (
          <>
            <div className="sw-sheet-body">
              <div className="sw-outcome">
                <p className="pay">
                  <span className="k">From this wallet</span>
                  <span className="v">
                    {usdAligned(amount.usd)} USDC
                    {money ? <span className="sw-local"> {money.format(amount.usd)}</span> : null}
                  </span>
                </p>
                <p className="get">
                  <span className="k">They get</span>
                  <span className="v">
                    {usdAligned(fromRaw(cashRaw))} to spend{unitsOut ? <> and about <strong>{unitsOut}</strong> {asset.ticker}</> : null}
                  </span>
                  <span className="sub">{unitsOut ? `${asset.fullName}, ` : ""}into a wallet of their own</span>
                </p>
                {note ? (
                  <p className="get">
                    <span className="k">With your note</span>
                    <span className="v is-note">
                      {note.note ? `“${note.note}”` : null}
                      {note.note && note.from ? " " : null}
                      {note.from ? <span className="sub">from {note.from}</span> : null}
                    </span>
                  </p>
                ) : null}
              </div>
              <dl className="sw-facts">
                {leastOut ? (
                  <div>
                    <dt>At the least</dt>
                    <dd>
                      {leastOut} {asset.ticker}. If the price on Aquarius moves more than {(fresh?.toleranceBps ?? 100) / 100}% first, nothing happens and nothing is spent.
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Network fee</dt>
                  <dd>
                    {feeStroops !== null ? (
                      <>
                        About {xlm(feeStroops)}
                        {feeMoney ? ` (${feeMoney})` : testnet ? " of test XLM" : ""}, from your wallet. Most of it keeps this receipt in the ledger for six months.
                      </>
                    ) : phase === "building" ? (
                      "Asking the network…"
                    ) : (
                      "Known once the send is prepared."
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Returned by itself</dt>
                  <dd>On {returnsOn} if nobody claims it. You can take it back any time before.</dd>
                </div>
                <div>
                  <dt>The issuer</dt>
                  <dd>
                    {asset.disclosure}
                    <details className="sw-more">
                      <summary>Everything about {asset.ticker}</summary>
                      <span>
                        {asset.issuerName}: “{asset.quote}” (
                        <a href={asset.quoteSource} target="_blank" rel="noreferrer">
                          {asset.quoteSourceLabel}
                        </a>
                        ). The price is the pool&apos;s, at the ledger the send lands in; it can fall.
                      </span>
                    </details>
                  </dd>
                </div>
              </dl>
              {why ? (
                <p className="sw-note is-warn">
                  {why} {/nothing moved/i.test(why) ? "" : "Nothing moved."}
                </p>
              ) : null}
            </div>
            <div className="sw-sheet-foot">
              {!fits && spendable !== null ? <p className="sw-note is-warn">This wallet holds {usdAligned(fromRaw(spendable))} of USDC, less than {usdLabel}. Choose a smaller amount.</p> : null}
              <p className="sw-trust">
                <ShieldCheck size={16} strokeWidth={2} aria-hidden />
                <span>The money goes to the Sown contract until they claim it. Nobody at Sown can move it. Sending confirms the recipient is not a US person.</span>
              </p>
              <button type="button" className="sw-btn is-primary is-block" onClick={() => void approve()} disabled={busy || !fresh || !fits || (!prepared && phase !== "failed")}>
                {phase === "building"
                  ? "Preparing…"
                  : phase === "signing"
                    ? "Approve in your wallet…"
                    : phase === "confirming"
                      ? "Sending on Stellar…"
                      : phase === "failed"
                        ? "Try again"
                        : `Approve ${usdLabel} in wallet`}
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </div>
  );
}

function feeInMoney(stroops: number, usdPerXlm: number): string {
  const v = (stroops / 1e7) * usdPerXlm;
  if (v < 0.01) return "less than a cent";
  if (v < 1) return `about ${Math.round(v * 100)} cents`;
  return `about $${v.toFixed(2)}`;
}

function WalletChoice({ wallets, why, onPick }: { wallets: WalletOption[] | null; why: string | null; onPick: (w: WalletOption) => void }) {
  if (wallets === null) {
    return (
      <div className="sw-sheet-body">
        <p className="sw-sheet-say">Looking for Stellar wallets in this browser…</p>
      </div>
    );
  }
  const here = wallets.filter((w) => w.available);
  const elsewhere = wallets.filter((w) => !w.available);
  return (
    <div className="sw-sheet-body">
      {here.length === 0 ? (
        <p className="sw-sheet-say">
          {isPhone()
            ? "No Stellar wallet is open in this browser. Open this page in your wallet app's own browser, or use a wallet that works on the web, such as xBull or Albedo."
            : "No Stellar wallet is installed in this browser. Install one of these, then come back to this page."}
        </p>
      ) : null}
      <div className="sw-wallets">
        {here.map((w) => (
          <button key={w.id} type="button" className="sw-wallet" onClick={() => onPick(w)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {w.icon ? <img src={w.icon} alt="" width={22} height={22} /> : null}
            {w.name}
          </button>
        ))}
        {elsewhere.map((w) => (
          <a key={w.id} href={w.url} className="sw-wallet is-install" target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {w.icon ? <img src={w.icon} alt="" width={22} height={22} /> : null}
            Get {w.name}
          </a>
        ))}
      </div>
      {why ? <p className="sw-note is-warn">{why}</p> : null}
      <p className="sw-sheet-fine">Connecting moves nothing. The next screen says exactly what this send will do before your wallet asks you to approve it.</p>
    </div>
  );
}
