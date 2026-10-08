import { describe, expect, it } from "vitest";
import { keepAssetByKey } from "./catalogue";
import { disclosure, flagChips } from "./disclosure";

const usdy = keepAssetByKey("mainnet", "usdy")!;
const xlm = keepAssetByKey("testnet", "xlm")!;
// Read off Ondo's issuer account on 2026-10-08 (docs/RESEARCH.md §3).
const ONDO = { auth_required: false, auth_revocable: true, auth_immutable: false, auth_clawback_enabled: true };

describe("the issuer line", () => {
  it("says what the flags say, in the spec's words", () => {
    expect(disclosure(usdy, ONDO)).toBe("Ondo issues USDY and can freeze this balance or take it back; it needs no permission to hold. Not for US persons.");
  });
  it("never claims a power the issuer does not have", () => {
    const none = { ...ONDO, auth_revocable: false, auth_clawback_enabled: false };
    expect(disclosure(usdy, none)).toBe("Ondo issues USDY and cannot freeze it or take it back; it needs no permission to hold. Not for US persons.");
    expect(disclosure(usdy, { ...ONDO, auth_clawback_enabled: false })).toContain("can freeze this balance;");
    expect(disclosure(usdy, { ...ONDO, auth_required: true })).toContain("it must approve each holder first");
  });
  it("says it could not read the flags rather than guessing", () => {
    expect(disclosure(usdy, null)).toBe("What Ondo can do with USDY could not be read from the ledger just now.");
  });
  it("labels the testnet stand-in", () => {
    expect(disclosure(xlm, null)).toContain("On testnet it stands in for US Treasuries.");
  });
  it("renders chips for only what is true", () => {
    expect(flagChips(ONDO, true)).toEqual(["issuer can freeze", "issuer can take back", "no permission needed to hold"]);
    expect(flagChips(null, true)).toEqual(["flags not read"]);
    expect(flagChips(null, false)).toEqual(["no issuer"]);
  });
});
