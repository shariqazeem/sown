import { createHash, randomBytes, webcrypto } from "node:crypto";

/**
 * A SOFTWARE PASSKEY, for the battery and the Day-0 smoke only. It answers the Smart Account
 * Kit's `webAuthn` hooks the way a phone's platform authenticator would: a P-256 key made on
 * the spot, assertions over `authenticatorData || sha256(clientDataJSON)` with the user-present
 * and user-verified flags set, DER signatures. The chain's WebAuthn verifier cannot tell it from
 * Face ID, which is the point: the claim path is exercised end to end without a human.
 *
 * It never runs in the app. A real recipient's key lives in their phone's secure enclave.
 */
const subtle = webcrypto.subtle;

const b64u = (b: Uint8Array | Buffer): string => Buffer.from(b).toString("base64url");
const sha256 = (b: Uint8Array | Buffer): Buffer => createHash("sha256").update(b).digest();

/** IEEE P1363 (r || s, 64 bytes) → ASN.1 DER, as an authenticator returns it. */
export function p1363ToDer(sig: Uint8Array): Buffer {
  const int = (x: Uint8Array): Buffer => {
    let i = 0;
    while (i < x.length - 1 && x[i] === 0) i += 1;
    let v = Buffer.from(x.subarray(i));
    if (v[0]! & 0x80) v = Buffer.concat([Buffer.from([0]), v]);
    return Buffer.concat([Buffer.from([0x02, v.length]), v]);
  };
  const r = int(sig.subarray(0, 32));
  const s = int(sig.subarray(32, 64));
  return Buffer.concat([Buffer.from([0x30, r.length + s.length]), r, s]);
}

/** What it takes to use the same passkey in another process: a secret, kept under `.keys/` only. */
export type SavedPasskey = {
  readonly origin: string;
  readonly rpId: string;
  readonly credentialId: string;
  readonly privateJwk: JsonWebKey;
  readonly publicJwk: JsonWebKey;
  readonly counter: number;
};

export type SoftPasskey = {
  readonly webAuthn: {
    startRegistration: (o: { optionsJSON: { rp: { id?: string }; challenge: string } }) => Promise<unknown>;
    startAuthentication: (o: { optionsJSON: { rpId?: string; challenge: string } }) => Promise<unknown>;
  };
  readonly origin: string;
  /** How many assertions it has made: one per Face ID a person would see. */
  readonly prompts: () => number;
  /** The key and its credential id, to restore it elsewhere (null before registration). */
  readonly save: () => Promise<SavedPasskey | null>;
};

const P256 = { name: "ECDSA", namedCurve: "P-256" } as const;

export function softPasskey(origin: string, rpId: string, saved?: SavedPasskey): SoftPasskey {
  let key: CryptoKeyPair | null = null;
  let credentialId: Buffer | null = saved ? Buffer.from(saved.credentialId, "base64url") : null;
  let counter = saved?.counter ?? 0;
  let prompts = 0;
  const restore = async (): Promise<void> => {
    if (key || !saved) return;
    key = {
      privateKey: await subtle.importKey("jwk", saved.privateJwk, P256, true, ["sign"]),
      publicKey: await subtle.importKey("jwk", saved.publicJwk, P256, true, ["verify"]),
    };
  };

  const authData = (withCounter: number): Buffer => {
    const flags = 0x01 | 0x04; // user present, user verified
    const count = Buffer.alloc(4);
    count.writeUInt32BE(withCounter);
    return Buffer.concat([sha256(Buffer.from(rpId)), Buffer.from([flags]), count]);
  };

  return {
    origin,
    prompts: () => prompts,
    save: async () => {
      await restore();
      if (!key || !credentialId) return null;
      return {
        origin,
        rpId,
        credentialId: b64u(credentialId),
        privateJwk: await subtle.exportKey("jwk", key.privateKey),
        publicJwk: await subtle.exportKey("jwk", key.publicKey),
        counter,
      };
    },
    webAuthn: {
      async startRegistration({ optionsJSON }) {
        prompts += 1;
        key = (await subtle.generateKey(P256, true, ["sign", "verify"])) as CryptoKeyPair;
        credentialId = randomBytes(16);
        const spki = Buffer.from(await subtle.exportKey("spki", key.publicKey));
        const clientDataJSON = Buffer.from(JSON.stringify({ type: "webauthn.create", challenge: optionsJSON.challenge, origin, crossOrigin: false }));
        return {
          id: b64u(credentialId),
          rawId: b64u(credentialId),
          type: "public-key",
          authenticatorAttachment: "platform",
          clientExtensionResults: {},
          response: {
            clientDataJSON: b64u(clientDataJSON),
            attestationObject: b64u(Buffer.alloc(0)),
            authenticatorData: b64u(authData(0)),
            publicKey: b64u(spki),
            publicKeyAlgorithm: -7,
            transports: ["internal"],
          },
        };
      },
      async startAuthentication({ optionsJSON }) {
        await restore();
        if (!key || !credentialId) throw new Error("No passkey on this authenticator yet");
        prompts += 1;
        counter += 1;
        const data = authData(counter);
        const clientDataJSON = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge: optionsJSON.challenge, origin, crossOrigin: false }));
        const signed = Buffer.concat([data, sha256(clientDataJSON)]);
        const raw = new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key.privateKey, signed));
        return {
          id: b64u(credentialId),
          rawId: b64u(credentialId),
          type: "public-key",
          authenticatorAttachment: "platform",
          clientExtensionResults: {},
          response: {
            authenticatorData: b64u(data),
            clientDataJSON: b64u(clientDataJSON),
            signature: b64u(p1363ToDer(raw)),
            userHandle: undefined,
          },
        };
      },
    },
  };
}
