import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** The transaction hashes behind each envelope, by kind. The envelope itself is on chain. */
export const txs = sqliteTable(
  "txs",
  {
    network: text("network").notNull(),
    envelopeId: text("envelope_id").notNull(),
    kind: text("kind").notNull(),
    hash: text("hash").notNull(),
    ledger: integer("ledger").notNull(),
    at: integer("at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.network, t.envelopeId, t.kind] })],
);
