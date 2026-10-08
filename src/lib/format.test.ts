import { describe, expect, it } from "vitest";
import { bps, dateUTC, rawFromUsd, short, since, stampUTC, units, unitsExact, until, usd, usdc, usdcProse, xlm } from "./format";

describe("money on a surface", () => {
  it("reads dollars the way a person writes them", () => {
    expect(usd(100)).toBe("$100");
    expect(usd(90.5)).toBe("$90.50");
    expect(usd(1250)).toBe("$1,250");
    expect(usdc(900_000_000n)).toBe("$90.00");
    expect(usdcProse(900_000_000n)).toBe("$90");
    expect(usdcProse("905000000")).toBe("$90.50");
  });
  it("shows the keep at four places, all seven on request", () => {
    expect(units(87_709_000n)).toBe("8.7709");
    expect(units(1_518_800_805_6n)).toBe("1,518.8008");
    expect(unitsExact(87_709_123n)).toBe("8.7709123");
    expect(unitsExact(5n)).toBe("0.0000005");
  });
  it("turns typed dollars into raw units exactly, and refuses what is not money", () => {
    expect(rawFromUsd("100")).toBe(1_000_000_000n);
    expect(rawFromUsd("0.5")).toBe(5_000_000n);
    expect(rawFromUsd("12.3456789")).toBe(123_456_789n);
    expect(rawFromUsd(25)).toBe(250_000_000n);
    expect(rawFromUsd("")).toBeNull();
    expect(rawFromUsd("1e3")).toBeNull();
    expect(rawFromUsd("-5")).toBeNull();
    expect(rawFromUsd("1.23456789")).toBeNull();
  });
  it("prints rates, addresses and fees", () => {
    expect(bps(1000)).toBe("10%");
    expect(bps(2550)).toBe("25.5%");
    expect(short("GBL2HPXJUXNQ4GAJFLLKF5ISERWN6GQCDHFI3GMTSYZQMUWIVJ2SR6P5")).toBe("GBL2…R6P5");
    expect(xlm(2_046_000n)).toBe("0.2046 XLM");
  });
});

describe("time on a surface", () => {
  it("stamps UTC with fixed month names", () => {
    expect(dateUTC(1_791_452_102)).toBe("8 Oct 2026");
    expect(stampUTC(1_791_452_102)).toBe("8 Oct 2026, 09:35 UTC");
  });
  it("says how long ago and how long until", () => {
    const now = 1_791_452_102_000;
    expect(since(1_791_452_102 - 10, now)).toBe("just now");
    expect(since(1_791_452_102 - 300, now)).toBe("5 min ago");
    expect(until(1_791_452_102 + 30 * 86_400 + 60, now)).toBe("in 30 days");
    expect(until(1_791_452_102 + 86_400 + 5, now)).toBe("tomorrow");
  });
});
