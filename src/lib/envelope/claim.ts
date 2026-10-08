import { Address, Keypair, nativeToScVal, xdr } from "@stellar/stellar-sdk";

/**
 * THE LINK'S SECRET AND WHAT IT SIGNS.
 *
 * The secret is 32 random bytes made in the sender's browser: an ed25519 seed. The envelope
 * stores its public key (`claim_key`). Whoever holds the link claims by signing
 * `("claim", contract, id, to)` — the same ScVal XDR the contract builds in `claim_message` —
 * so the seed never leaves the browser that holds the link, and a claim cannot be redirected:
 * the signature names its destination. The bytes are held by a test on both sides.
 */
export function claimMessage(contractId: string, id: bigint | number, to: string): Buffer {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("claim"),
    Address.fromString(contractId).toScVal(),
    nativeToScVal(BigInt(id), { type: "u64" }),
    Address.fromString(to).toScVal(),
  ]).toXDR();
}

export function claimKeypair(secret: Uint8Array): Keypair {
  if (secret.length !== 32) throw new Error("A claim secret is 32 bytes.");
  return Keypair.fromRawEd25519Seed(Buffer.from(secret));
}

/** The envelope's `claim_key`: the raw 32-byte public key. */
export function claimKey(secret: Uint8Array): Buffer {
  return claimKeypair(secret).rawPublicKey();
}

export function signClaim(secret: Uint8Array, contractId: string, id: bigint | number, to: string): Buffer {
  return claimKeypair(secret).sign(claimMessage(contractId, id, to));
}

export function newSecret(): Uint8Array {
  const b = new Uint8Array(32);
  globalThis.crypto.getRandomValues(b);
  return b;
}

/** The fragment form: unpadded base64url, 43 characters. */
export function encodeSecret(secret: Uint8Array): string {
  return Buffer.from(secret).toString("base64url");
}

/** Null for anything that is not exactly a 32-byte secret: an incomplete link says so. */
export function decodeSecret(fragment: string | null | undefined): Uint8Array | null {
  if (!fragment) return null;
  const s = fragment.replace(/^#/, "").trim();
  if (!/^[A-Za-z0-9_-]{43}$/.test(s)) return null;
  const b = Buffer.from(s, "base64url");
  return b.length === 32 ? new Uint8Array(b) : null;
}

/** Does this secret open this envelope? Compared before anything is signed or sent. */
export function secretOpens(secret: Uint8Array, claimKeyHex: string): boolean {
  return claimKey(secret).toString("hex") === claimKeyHex.toLowerCase();
}

/** The path a recipient opens. The secret rides in the fragment, which no server receives. */
export function claimPath(id: bigint | number, secret: Uint8Array): string {
  return `/r/${id.toString()}#${encodeSecret(secret)}`;
}
