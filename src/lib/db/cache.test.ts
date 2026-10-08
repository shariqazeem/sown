import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * THE CACHE REMEMBERS HASHES BY CONTRACT. A redeployed contract numbers its envelopes from 0
 * again; found on 9 October, when the testnet redeploy's receipts showed the first contract's
 * transactions for the same numbers.
 */
const dir = mkdtempSync(join(tmpdir(), "sown-cache-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("the transaction cache", () => {
  it("keeps one contract's envelope 0 apart from another's", async () => {
    process.env.SOWN_DB = join(dir, "cache.db");
    const { cachedTx, recordTx } = await import("./index");
    recordTx("0", "send", "a".repeat(64), 10, 100, "CONTRACT_A");
    expect(cachedTx("0", "send", "CONTRACT_B")).toBeNull();
    expect(cachedTx("0", "send", "CONTRACT_A")).toEqual({ hash: "a".repeat(64), ledger: 10, at: 100 });
    recordTx("0", "send", "b".repeat(64), 11, 101, "CONTRACT_B");
    expect(cachedTx("0", "send", "CONTRACT_B")?.hash).toBe("b".repeat(64));
    expect(cachedTx("0", "send", "CONTRACT_A")?.hash).toBe("a".repeat(64));
  });
});
