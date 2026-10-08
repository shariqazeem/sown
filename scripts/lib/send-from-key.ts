import { type Keypair, TransactionBuilder, scValToNative } from "@stellar/stellar-sdk";
import type { KeepAssetEntry } from "@/lib/assets/catalogue";
import { claimKey, newSecret } from "@/lib/envelope/claim";
import { type Outcome, ok } from "@/lib/outcome";
import { type Quote, quote } from "@/lib/quote";
import { DAY, type Prepared, prepareSend } from "@/lib/send/build";
import type { NetworkConfig } from "@/lib/stellar/network";
import { sendAndWait } from "@/lib/stellar/soroban";

/**
 * A SEND FROM A KEY, for the scripts: the same quote and the same `prepareSend` the send card
 * uses, then one signature. `prepareFrom` stops before signing, so a dry run can show exactly
 * what would be sent, simulated at the current ledger, from an address alone.
 */
export type PreparedFrom = { readonly prepared: Prepared; readonly quote: Quote; readonly secret: Uint8Array };

export async function prepareFrom(net: NetworkConfig, contractId: string, sender: string, asset: KeepAssetEntry, usd: number, keepBps: number, returnDays = 30): Promise<Outcome<PreparedFrom>> {
  const amountRaw = BigInt(Math.round(usd * 1e7));
  const q = await quote(net, asset, amountRaw, keepBps);
  if (!q.ok) return q;
  const secret = newSecret();
  const prepared = await prepareSend(net, contractId, {
    sender,
    amountRaw,
    keepBps,
    keepAsset: asset.sac,
    minKeepOutRaw: BigInt(q.value.minKeepOutRaw),
    claimKeyHex: claimKey(secret).toString("hex"),
    memoHex: "00".repeat(32),
    returnAt: Math.floor(Date.now() / 1000) + returnDays * DAY,
  });
  if (!prepared.ok) return prepared;
  return ok({ prepared: prepared.value, quote: q.value, secret });
}

export type SentFromKey = {
  readonly id: bigint;
  readonly secret: Uint8Array;
  readonly hash: string;
  readonly ledger: number;
  readonly quote: Quote;
  readonly seconds: number;
  readonly fee: string | undefined;
};

export async function sendFromKey(net: NetworkConfig, contractId: string, sender: Keypair, asset: KeepAssetEntry, usd: number, keepBps: number, returnDays = 30): Promise<Outcome<SentFromKey>> {
  const t0 = Date.now();
  const p = await prepareFrom(net, contractId, sender.publicKey(), asset, usd, keepBps, returnDays);
  if (!p.ok) return p;
  const tx = TransactionBuilder.fromXDR(p.value.prepared.xdr, net.passphrase);
  tx.sign(sender);
  const landed = await sendAndWait(net, tx);
  if (!landed.ok) return landed;
  const id = BigInt(scValToNative(landed.value.returnValue!) as bigint);
  return ok({ id, secret: p.value.secret, hash: landed.value.hash, ledger: landed.value.ledger, quote: p.value.quote, seconds: (Date.now() - t0) / 1000, fee: landed.value.feeCharged });
}
