import { Account, Asset, FeeBumpTransaction, Keypair, Operation, StrKey, Transaction, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import { type Outcome, held, ok } from "@/lib/outcome";

/**
 * SHAPE 3 — A CLASSIC WALLET MADE READY TO HOLD WHAT IT IS ABOUT TO CLAIM, PAID BY SOWN.
 *
 * A G-address holds an issued asset only through a trustline, and a trustline locks half an
 * XLM of reserve. A recipient may have no XLM at all, or no account yet, so Sown's servers
 * sponsor the reserves (CAP-33: begin/end sponsoring) and, if the account does not exist,
 * create it with 0 XLM. The recipient signs their own operations; the sponsor's account is the
 * transaction's source and pays the fee. The reserves come back to the sponsor if the
 * trustlines are ever removed.
 *
 * The relay builds this transaction, the wallet signs it, and the relay accepts it back only
 * if it is exactly what it built: same source, same operations, the recipient's valid
 * signature, a near expiry and a capped fee. Then the sponsor signs last.
 */
export type TrustNeed = { readonly exists: boolean; readonly assets: readonly Asset[] };

export const TRUST_TIMEOUT_SECONDS = 300;
const FEE_PER_OP = 1_000; // stroops; a classic op's minimum is 100

export function trustlineOps(account: string, need: TrustNeed): xdr.Operation[] {
  const ops: xdr.Operation[] = [Operation.beginSponsoringFutureReserves({ sponsoredId: account })];
  if (!need.exists) ops.push(Operation.createAccount({ destination: account, startingBalance: "0" }));
  for (const asset of need.assets) ops.push(Operation.changeTrust({ asset, source: account }));
  ops.push(Operation.endSponsoringFutureReserves({ source: account }));
  return ops;
}

export function buildTrustlineTx(passphrase: string, sponsor: Account, account: string, need: TrustNeed): Transaction {
  const ops = trustlineOps(account, need);
  const b = new TransactionBuilder(sponsor, { fee: String(FEE_PER_OP), networkPassphrase: passphrase }).setTimeout(TRUST_TIMEOUT_SECONDS);
  for (const op of ops) b.addOperation(op);
  return b.build();
}

/** Accept the wallet's signed copy only if it is the transaction the relay would build. */
export function inspectSignedTrustlineTx(
  passphrase: string,
  signedXdr: unknown,
  sponsorPublicKey: string,
  account: string,
  need: TrustNeed,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Outcome<Transaction> {
  const refuse = (why: string) => held<Transaction>(`Sown's servers will not co-sign this: ${why}.`);
  if (typeof signedXdr !== "string" || signedXdr.length > 20_000) return refuse("it is not a transaction");
  if (!StrKey.isValidEd25519PublicKey(account)) return refuse("that is not a classic wallet address");
  let parsed: Transaction | FeeBumpTransaction;
  try {
    parsed = TransactionBuilder.fromXDR(signedXdr, passphrase);
  } catch {
    return refuse("it could not be read");
  }
  if (parsed instanceof FeeBumpTransaction) return refuse("it is wrapped in a fee bump");
  const tx = parsed;
  if (tx.source !== sponsorPublicKey) return refuse("its source is not Sown's account");
  const expected = trustlineOps(account, need).map((o) => o.toXDR("base64"));
  const got = tx.operations.map((_, i) => tx.toEnvelope().v1().tx().operations()[i]!.toXDR("base64"));
  if (expected.length !== got.length || expected.some((e, i) => e !== got[i])) return refuse("its operations are not exactly the trustlines this wallet needs");
  if (Number(tx.fee) > FEE_PER_OP * expected.length) return refuse("its fee is above the cap");
  const max = Number(tx.timeBounds?.maxTime ?? 0);
  if (!max || max > nowSeconds + TRUST_TIMEOUT_SECONDS + 60) return refuse("it does not expire soon enough");
  if (max < nowSeconds) return refuse("it has expired; prepare it again");
  if (tx.memo.type !== "none") return refuse("it carries a memo");
  const signer = Keypair.fromPublicKey(account);
  const hint = signer.signatureHint();
  const sigs = tx.signatures;
  if (sigs.length !== 1) return refuse("it must carry the wallet's signature and nothing else");
  const sig = sigs[0]!;
  if (!Buffer.from(sig.hint()).equals(hint) || !signer.verify(tx.hash(), sig.signature())) return refuse("the wallet's signature does not match");
  return ok(tx);
}
