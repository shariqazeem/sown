import { describe, expect, it } from "vitest";
import { parsePrefill } from "./prefill";

describe("a link to the send card", () => {
  it("prefills only what it carries", () => {
    expect(parsePrefill("", ["usdy"])).toEqual({});
    expect(parsePrefill("?usd=50", ["usdy"])).toEqual({ usd: 50 });
    expect(parsePrefill("?usd=50&keep=1000&asset=usdy", ["usdy"])).toEqual({ usd: 50, keepBps: 1000, asset: "usdy" });
  });
  it("never reads an absent keep as a keep of nothing", () => {
    expect(parsePrefill("?usd=25", ["usdy"]).keepBps).toBeUndefined();
    expect(parsePrefill("?keep=0", ["usdy"]).keepBps).toBe(0);
  });
  it("refuses what is out of range or unknown", () => {
    expect(parsePrefill("?usd=0.5&keep=10001&asset=gold", ["usdy"])).toEqual({});
    expect(parsePrefill("?usd=abc&keep=1.5", ["usdy"])).toEqual({});
  });
});
