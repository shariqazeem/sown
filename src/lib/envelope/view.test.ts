import { describe, expect, it } from "vitest";
import type { Envelope } from "./types";
import { fillPrice, headline, returnWords, sentTotal, stillHeld } from "./view";

const NOW = 1_791_452_102;
const base: Envelope = {
  id: 7n,
  sender: "GBL2HPXJUXNQ4GAJFLLKF5ISERWN6GQCDHFI3GMTSYZQMUWIVJ2SR6P5",
  cash: 900_000_000n,
  keepAsset: "CB3YA656OYIHU57657I5KGSBRHE5I3OZU4VFC22PYAOANFZHEWNYGAGP",
  keepIn: 100_000_000n,
  keepOut: 88_121_918n,
  keepBps: 1000,
  claimKeyHex: "00".repeat(32),
  memoHex: "00".repeat(32),
  createdAt: NOW - 3600,
  createdLedger: 1,
  returnAt: NOW + 29 * 86_400,
  state: "open",
  claimedBy: null,
  claimedAt: 0,
  claimedLedger: 0,
  measuredAt: 0,
  measuredBalance: 0n,
};

describe("what an envelope prints", () => {
  it("adds the two parts back to what was sent", () => {
    expect(sentTotal(base)).toBe(1_000_000_000n);
  });
  it("prices the fill from the envelope's own figures", () => {
    expect(fillPrice(base, "USDY")).toBe("$1.1348 per USDY");
    expect(fillPrice({ keepIn: 0n, keepOut: 0n }, "USDY")).toBeNull();
  });
  it("says still held as a date until it is measured, then as units and a share", () => {
    expect(stillHeld(base, "USDY", NOW).text).toBe("measured 30 days after the claim");
    const claimed = { ...base, state: "claimed" as const, claimedAt: NOW - 86_400 };
    expect(stillHeld(claimed, "USDY", NOW)).toEqual({ text: "to be measured on 6 Nov 2026", tone: "muted" });
    expect(stillHeld({ ...claimed, claimedAt: NOW - 40 * 86_400 }, "USDY", NOW).text).toMatch(/^due .*, not measured yet$/);
    const measured = { ...claimed, measuredAt: NOW, measuredBalance: 88_121_918n };
    expect(stillHeld(measured, "USDY", NOW)).toEqual({ text: "8.8122 USDY on 8 Oct 2026 · 100%", tone: "ok" });
    expect(stillHeld({ ...measured, measuredBalance: 44_060_959n }, "USDY", NOW).text).toContain("· 50%");
  });
  it("names each state and how it comes back", () => {
    expect(headline(base).tone).toBe("waiting");
    expect(returnWords(base, NOW)).toBe("If nobody claims it, it goes back to the sender on 6 Nov 2026. The sender can take it back before then.");
    expect(returnWords({ ...base, state: "returned", claimedAt: NOW - 100 }, NOW)).toBe("The sender took this back on 8 Oct 2026.");
    expect(returnWords({ ...base, state: "returned", returnAt: NOW - 200, claimedAt: NOW - 100 }, NOW)).toBe("This went back to the sender on 8 Oct 2026, unclaimed.");
  });
});
