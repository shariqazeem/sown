import { scValToNative, xdr } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import fixtures from "./fixtures.json";
import { decodeEnvelope, envelopeFromJson, envelopeToJson } from "./types";

// get(1), get(2), get(3) as the testnet contract returned them (scripts/lib/record-envelope.ts).
const read = (id: "1" | "2" | "3") => decodeEnvelope(scValToNative(xdr.ScVal.fromXDR(fixtures.get[id], "base64")) as Record<string, unknown>);

describe("the envelope, decoded from the contract's own record", () => {
  it("reads a claimed envelope: the passkey wallet, both parts, the ledgers", () => {
    const e = read("1");
    expect(e.id).toBe(1n);
    expect(e.state).toBe("claimed");
    expect(e.claimedBy?.startsWith("C")).toBe(true);
    expect(e.cash + e.keepIn).toBe(50_000_000n);
    expect(e.keepBps).toBe(1000);
    expect(e.keepOut > 0n).toBe(true);
    expect(e.claimKeyHex).toMatch(/^[0-9a-f]{64}$/);
    expect(e.claimedLedger).toBeGreaterThan(e.createdLedger);
    expect(e.measuredAt).toBe(0);
  });
  it("reads a returned envelope: no claimant, the return time kept", () => {
    const e = read("2");
    expect(e.state).toBe("returned");
    expect(e.claimedBy).toBeNull();
    expect(e.claimedAt).toBeGreaterThan(0);
  });
  it("reads an open envelope", () => {
    const e = read("3");
    expect(e.state).toBe("open");
    expect(e.claimedAt).toBe(0);
    expect(e.returnAt).toBeGreaterThan(e.createdAt + 86_400);
  });
  it("survives the trip through JSON to a client component and back", () => {
    const e = read("1");
    expect(envelopeFromJson(JSON.parse(JSON.stringify(envelopeToJson(e))))).toEqual(e);
  });
  it("refuses a malformed record rather than printing a wrong figure", () => {
    expect(() => decodeEnvelope({ id: "x" })).toThrow();
  });
});
