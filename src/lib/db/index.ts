import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { networkName } from "@/lib/stellar/network";
import { txs } from "./schema";

/**
 * A CACHE OF THE CHAIN, NEVER A LEDGER OF RECORD. It remembers the transaction hashes the RPC
 * forgets after its event retention, so a months-old receipt still links its send and claim.
 * `SOWN_DB=""` turns it off (the tests do); every page then reads the chain alone.
 */
type Db = ReturnType<typeof drizzle>;
const KEY = Symbol.for("sown.db");

function open(): Db | null {
  const configured = process.env.SOWN_DB;
  if (configured === "") return null;
  const g = globalThis as unknown as Record<symbol, Db | null | undefined>;
  if (g[KEY] !== undefined) return g[KEY] ?? null;
  try {
    const path = configured ?? join(process.cwd(), "var", `sown.${networkName()}.db`);
    mkdirSync(dirname(path), { recursive: true });
    const sqlite = new Database(path);
    sqlite.pragma("journal_mode = WAL");
    sqlite.exec(`CREATE TABLE IF NOT EXISTS txs (
      network TEXT NOT NULL, envelope_id TEXT NOT NULL, kind TEXT NOT NULL,
      hash TEXT NOT NULL, ledger INTEGER NOT NULL, at INTEGER NOT NULL,
      PRIMARY KEY (network, envelope_id, kind))`);
    g[KEY] = drizzle(sqlite);
  } catch {
    g[KEY] = null;
  }
  return g[KEY] ?? null;
}

export type TxKind = "send" | "claim" | "refund" | "deploy" | "trust";

export function recordTx(envelopeId: string, kind: TxKind, hash: string, ledger: number, at: number): void {
  const db = open();
  if (!db) return;
  try {
    db.insert(txs).values({ network: networkName(), envelopeId, kind, hash, ledger, at }).onConflictDoNothing().run();
  } catch {
    // A cache that cannot write is a cache that is empty; the chain still answers.
  }
}

export function cachedTx(envelopeId: string, kind: TxKind): { hash: string; ledger: number; at: number } | null {
  const db = open();
  if (!db) return null;
  try {
    const row = db.select().from(txs).where(and(eq(txs.network, networkName()), eq(txs.envelopeId, envelopeId), eq(txs.kind, kind))).get();
    return row ? { hash: row.hash, ledger: row.ledger, at: row.at } : null;
  } catch {
    return null;
  }
}
