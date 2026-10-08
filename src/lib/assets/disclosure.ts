import type { KeepAssetEntry } from "@/lib/assets/catalogue";

/**
 * THE ISSUER LINE, COMPOSED FROM FLAGS. Pure, so a test can hold every combination. The words
 * follow CLAUDE.md §4: "Ondo issues USDY and can freeze this balance or take it back; it needs
 * no permission to hold." A flag that is off is never claimed; a flag that could not be read is
 * said to be unread, never guessed.
 */
export type IssuerFlags = {
  readonly auth_required: boolean;
  readonly auth_revocable: boolean;
  readonly auth_immutable: boolean;
  readonly auth_clawback_enabled: boolean;
  readonly readAt?: number;
  readonly homeDomain?: string | null;
};

export function disclosure(asset: Pick<KeepAssetEntry, "issuerName" | "ticker" | "issuer" | "standIn" | "notForUs">, flags: IssuerFlags | null): string {
  if (!asset.issuer) {
    return asset.standIn
      ? `${asset.ticker} is the network's own asset, with no issuer to freeze or take it back. On testnet it stands in for US Treasuries.`
      : `${asset.ticker} is the network's own asset, with no issuer.`;
  }
  if (!flags) return `What ${asset.issuerName} can do with ${asset.ticker} could not be read from the ledger just now.`;
  const powers: string[] = [];
  if (flags.auth_revocable) powers.push("freeze this balance");
  if (flags.auth_clawback_enabled) powers.push("take it back");
  const can = powers.length ? ` and can ${powers.join(" or ")}` : " and cannot freeze it or take it back";
  const hold = flags.auth_required ? "; it must approve each holder first" : "; it needs no permission to hold";
  const us = asset.notForUs ? " Not for US persons." : "";
  return `${asset.issuerName} issues ${asset.ticker}${can}${hold}.${us}`;
}

/** The flags as chips for /assets: only what is true, in plain words. */
export function flagChips(flags: IssuerFlags | null, hasIssuer: boolean): string[] {
  if (!hasIssuer) return ["no issuer"];
  if (!flags) return ["flags not read"];
  const chips: string[] = [];
  if (flags.auth_revocable) chips.push("issuer can freeze");
  if (flags.auth_clawback_enabled) chips.push("issuer can take back");
  chips.push(flags.auth_required ? "issuer approves each holder" : "no permission needed to hold");
  if (flags.auth_immutable) chips.push("flags locked");
  return chips;
}
