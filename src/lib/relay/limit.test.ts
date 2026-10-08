import { beforeEach, describe, expect, it } from "vitest";
import { MOVES_PER_DAY, PER_WINDOW, WINDOW_MS, allowIp, allowWallet, lock, resetLimits, unlock } from "./limit";

describe("the guards in front of the sponsor's key", () => {
  beforeEach(() => resetLimits());

  it("lets an IP make a window's worth of requests, then holds it until the window passes", () => {
    const t = 1_000_000;
    for (let i = 0; i < PER_WINDOW; i += 1) expect(allowIp("1.2.3.4", t)).toBe(true);
    expect(allowIp("1.2.3.4", t)).toBe(false);
    expect(allowIp("5.6.7.8", t)).toBe(true);
    expect(allowIp("1.2.3.4", t + WINDOW_MS + 1)).toBe(true);
  });
  it("never pays twice for the same envelope at the same time", () => {
    expect(lock("claim:7")).toBe(true);
    expect(lock("claim:7")).toBe(false);
    expect(lock("claim:8")).toBe(true);
    unlock("claim:7");
    expect(lock("claim:7")).toBe(true);
  });
  it("pays for a few moves a day per wallet", () => {
    const t = 5_000_000;
    for (let i = 0; i < MOVES_PER_DAY; i += 1) expect(allowWallet("CABC", t)).toBe(true);
    expect(allowWallet("CABC", t)).toBe(false);
    expect(allowWallet("CABC", t + 86_400_001)).toBe(true);
  });
});
