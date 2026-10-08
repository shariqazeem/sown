import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * The transaction hashes behind each envelope, by kind. The envelope itself is on chain. Keyed
 * by the contract as well as the envelope number: a redeployed contract counts from 0 again, and
 * its envelope 0 must never borrow the old contract's transactions.
 */
export const envelopeTxs = sqliteTable(
  "envelope_txs",
  {
    contract: text("contract").notNull(),
    envelopeId: text("envelope_id").notNull(),
    kind: text("kind").notNull(),
    hash: text("hash").notNull(),
    ledger: integer("ledger").notNull(),
    at: integer("at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.contract, t.envelopeId, t.kind] })],
);
