/** The wire shapes the send card reads, shared by the server page and the client card. */
import type { Quote } from "@/lib/quote";

export type { Quote };

export type CardAsset = {
  readonly key: string;
  readonly sac: string;
  readonly name: string;
  readonly fullName: string;
  readonly ticker: string;
  readonly issuerName: string;
  readonly standIn: boolean;
  /** The issuer line, composed from the flags read off the issuer's account. */
  readonly disclosure: string;
  readonly quote: string;
  readonly quoteSource: string;
  readonly quoteSourceLabel: string;
  readonly issuerPage: string;
  readonly poolFeeBps: number;
};

export type HoldingsBody = {
  readonly address: string;
  readonly kind: "classic" | "passkey";
  readonly exists: boolean;
  readonly usdc: { readonly balanceRaw: string; readonly trusted: boolean | null };
  readonly keeps: ReadonlyArray<{ readonly key: string; readonly ticker: string; readonly name: string; readonly fullName: string; readonly issuerName: string; readonly balanceRaw: string; readonly valueUsdcRaw: string | null; readonly trusted: boolean | null; readonly standIn: boolean }>;
  readonly at: number;
};

export type PreparedBody = { readonly xdr: string; readonly feeStroops: string; readonly minResourceFee: string; readonly ledger: number; readonly passphrase: string };

export type RecordedBody = { readonly id: string; readonly hash: string; readonly ledger: number };
