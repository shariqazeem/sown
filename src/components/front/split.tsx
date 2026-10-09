"use client";

import { Reveal } from "@/components/motion/reveal";
import { LocalAmount } from "@/components/money/local-amount";
import "./split.css";

/**
 * WHAT HAPPENS TO $100 — the one picture of the product. A bar: the green part is spent,
 * the gold part stays. Drawn from the pool's own quote as the page loaded, and labelled as
 * arithmetic, never as a receipt. It enters once when reached (Reveal), nothing else moves.
 */
export function SplitScene({ usd, cash, keepUsd, keepBps, unitsOut, ticker, assetLine, ledger, standIn, quoted }: { usd: number; cash: number; keepUsd: number; keepBps: number; unitsOut: string | null; ticker: string; assetLine: string; ledger: number | null; standIn: boolean; quoted: boolean }) {
  const keepPct = keepBps / 100;
  return (
    <Reveal className="sw-scene">
      <div className="sw-scene-head">
        <p className="sw-scene-amount">
          <span className="n">${usd.toLocaleString("en-US")}</span>
          <span className="w">sent home</span>
        </p>
      </div>
      <div className="sw-scene-bar" role="img" aria-label={`${100 - keepPct}% to spend, ${keepPct}% stays theirs`}>
        <span className="spend" style={{ flexGrow: 100 - keepPct }} />
        <span className="stay" style={{ flexGrow: keepPct }} />
      </div>
      <div className="sw-scene-parts">
        <div className="sw-scene-part is-spend">
          <p className="k">
            <span className="dot" aria-hidden />
            {100 - keepPct}% to spend
          </p>
          <p className="v">
            ${cash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <LocalAmount usd={cash} />
          </p>
          <p className="d">Dollars (USDC) in their own wallet. MoneyGram-connected Stellar wallets turn it into cash in 170+ countries.</p>
        </div>
        <div className="sw-scene-part is-stay">
          <p className="k">
            <span className="dot" aria-hidden />
            {keepPct}% stays theirs
          </p>
          <p className="v">
            {unitsOut ? (
              <>
                {unitsOut} <span className="sym">{ticker}</span>
              </>
            ) : (
              <span className="sym">{quoted ? "nothing kept" : "no price just now"}</span>
            )}
          </p>
          <p className="d">
            ${keepUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of {assetLine}, bought on Aquarius inside the same send, in their own wallet. {standIn ? "On testnet XLM stands in." : "Theirs to hold, or to sell."}
          </p>
        </div>
      </div>
      <p className="sw-scene-foot">{quoted && ledger ? `Arithmetic at the pool's price as this page loaded (ledger ${ledger.toLocaleString("en-US")}), not a receipt. A real one is below.` : "The pool did not answer as this page loaded, so no figure is shown."}</p>
    </Reveal>
  );
}
