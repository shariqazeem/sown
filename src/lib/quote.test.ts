import { describe, expect, it } from "vitest";
import { cash, impliedPrice, keepIn, minOut } from "./quote";

describe("the slice arithmetic, exactly as the contract does it", () => {
  it("keeps keep_bps of the amount, floored, and leaves the rest as cash", () => {
    expect(keepIn(1_000_000_000n, 1_000)).toBe(100_000_000n);
    expect(cash(1_000_000_000n, 1_000)).toBe(900_000_000n);
    expect(keepIn(370_000_003n, 3_333)).toBe(123_321_000n);
    expect(keepIn(370_000_003n, 3_333) + cash(370_000_003n, 3_333)).toBe(370_000_003n);
    expect(keepIn(10_000_000n, 1)).toBe(1_000n);
    expect(keepIn(10_000_000n, 0)).toBe(0n);
    expect(keepIn(10_000_000n, 10_000)).toBe(10_000_000n);
  });
  it("refuses a rate out of range", () => {
    expect(() => keepIn(1n, 10_001)).toThrow();
    expect(() => keepIn(1n, -1)).toThrow();
    expect(() => keepIn(1n, 1.5)).toThrow();
  });
});

describe("the least it can become", () => {
  it("is the pool's estimate less the tolerance, floored", () => {
    expect(minOut(88_121_918n)).toBe(87_240_698n);
    expect(minOut(88_121_918n, 50)).toBe(87_681_308n);
    expect(minOut(0n)).toBe(0n);
  });
  it("never exceeds the estimate and refuses a tolerance of 100%", () => {
    for (const est of [1n, 7n, 999n, 123_456_789n]) expect(minOut(est) <= est).toBe(true);
    expect(() => minOut(100n, 10_000)).toThrow();
  });
  it("prices a fill as USDC in over units out", () => {
    expect(impliedPrice(100_000_000n, 88_121_918n)?.toFixed(6)).toBe("1.134791");
    expect(impliedPrice(1n, 0n)).toBeNull();
  });
});
