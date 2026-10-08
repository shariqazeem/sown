"use client";

import { useLocalMoney } from "./use-local-money";

/**
 * THE SAME AMOUNT IN THE READER'S OWN MONEY, after a dollar figure: " · ₨27,950". Nothing on
 * the server or for a dollar reader, so the dollar line is complete without it; the title names
 * the rate, its source and its day. Copied from Scrip (components/save/local-amount.tsx).
 */
export function LocalAmount({ usd, prefix = " · " }: { usd: number; prefix?: string }) {
  const money = useLocalMoney();
  if (!money) return null;
  const day = money.updated ? new Date(money.updated * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "today";
  return (
    <span className="sw-local" title={`At ${money.perUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${money.currency} to the dollar, ${money.source}, ${day}`}>
      {prefix}
      {money.format(usd)}
    </span>
  );
}
