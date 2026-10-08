import { Keypair } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { claimKey, claimMessage, claimPath, decodeSecret, encodeSecret, newSecret, secretOpens, signClaim } from "./claim";

// The same inputs and the same hex as contracts/sown/src/test.rs `the_claim_message_bytes_are_fixed`.
const CONTRACT = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const TO = "GCNSJWWL3CMKYKGBOBDO5P7UBOJH6YMQ3ZQENZFVJDKTWMMZEZTJIZLA";
const RUST_HEX =
  "0000001000000001000000040000000f00000005636c61696d0000000000001200000001d7928b72c2703ccfeaf7eb9ff4ef4d504a55a8b979fc9b450ea2c842b4d1ce610000000500000000000000070000001200000000000000009b24dacbd898ac28c17046eebff40b927f6190de6046e4b548d53b3199266694";

describe("the claim message", () => {
  it("is byte for byte what the contract builds", () => {
    expect(claimMessage(CONTRACT, 7n, TO).toString("hex")).toBe(RUST_HEX);
    expect(claimMessage(CONTRACT, 7, TO).toString("hex")).toBe(RUST_HEX);
  });
  it("names the destination, so a signature cannot be reused for another address or envelope", () => {
    const secret = new Uint8Array(32).fill(9);
    const other = Keypair.random().publicKey();
    const sig = signClaim(secret, CONTRACT, 7, TO);
    const pub = Keypair.fromRawEd25519Seed(Buffer.from(secret));
    expect(pub.verify(claimMessage(CONTRACT, 7, TO), sig)).toBe(true);
    expect(pub.verify(claimMessage(CONTRACT, 7, other), sig)).toBe(false);
    expect(pub.verify(claimMessage(CONTRACT, 8, TO), sig)).toBe(false);
  });
});

describe("the secret in the link", () => {
  it("round-trips through the fragment as 43 base64url characters", () => {
    const s = newSecret();
    const f = encodeSecret(s);
    expect(f).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(decodeSecret(f)!)).toEqual(Buffer.from(s));
    expect(Buffer.from(decodeSecret(`#${f}`)!)).toEqual(Buffer.from(s));
  });
  it("refuses anything that is not exactly 32 bytes", () => {
    expect(decodeSecret("")).toBeNull();
    expect(decodeSecret(null)).toBeNull();
    expect(decodeSecret("abc")).toBeNull();
    expect(decodeSecret(`${encodeSecret(newSecret())}x`)).toBeNull();
    expect(decodeSecret("!".repeat(43))).toBeNull();
  });
  it("opens only its own envelope", () => {
    const s = newSecret();
    expect(secretOpens(s, claimKey(s).toString("hex"))).toBe(true);
    expect(secretOpens(newSecret(), claimKey(s).toString("hex"))).toBe(false);
  });
  it("puts the secret in the fragment, never the path or the query", () => {
    const s = newSecret();
    const p = claimPath(12, s);
    expect(p.startsWith("/r/12#")).toBe(true);
    expect(p.split("#")[0]).not.toContain(encodeSecret(s));
  });
});
