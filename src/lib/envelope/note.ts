import { sha256 } from "@noble/hashes/sha256";
import { fromBase64Url, toBase64Url } from "./claim";

/**
 * THE NOTE THAT TRAVELS WITH THE LINK: who the send is from, and why.
 *
 * The words ride in the link's fragment after the secret (`#<secret>.<note>`), so no server and
 * no ledger ever sees them. The envelope holds only their sha256 (its `memo`), written by the
 * send itself, so the claim page can prove the note is the one the sender wrote and show
 * "Shariq sent you $100 · For school fees" with the ledger's word on it. A note that does not
 * hash to the envelope's memo is not shown at all.
 */
export type Note = { readonly from?: string; readonly note?: string };

export const NOTE_LIMITS = { from: 40, note: 140 } as const;

/** The memo of an envelope sent without a note. */
export const NO_NOTE_HEX = "00".repeat(32);

const clean = (s: string | undefined, max: number): string => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Trimmed and limited, keys in a fixed order; null when there is nothing to say. */
export function cleanNote(n: Note | null | undefined): Note | null {
  if (!n) return null;
  const from = clean(n.from, NOTE_LIMITS.from);
  const note = clean(n.note, NOTE_LIMITS.note);
  if (!from && !note) return null;
  return { ...(from ? { from } : {}), ...(note ? { note } : {}) };
}

/** The bytes whose sha256 is the envelope's memo: canonical JSON of the cleaned note. */
export function noteBytes(n: Note): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(cleanNote(n) ?? {}));
}

/** The envelope's `memo` for this note: sha256 of its bytes, or zeros for no note. */
export function noteHashHex(n: Note | null | undefined): string {
  const c = cleanNote(n);
  return c ? Buffer.from(sha256(noteBytes(c))).toString("hex") : NO_NOTE_HEX;
}

/** The note as it rides in the link: unpadded base64url of its bytes; null for no note. */
export function encodeNote(n: Note | null | undefined): string | null {
  const c = cleanNote(n);
  return c ? toBase64Url(noteBytes(c)) : null;
}

/** Back from the link; null for anything that is not a note. */
export function decodeNote(s: string | null | undefined): Note | null {
  if (!s || s.length > 1_200 || !/^[A-Za-z0-9_-]+$/.test(s)) return null;
  try {
    const j = JSON.parse(new TextDecoder().decode(fromBase64Url(s))) as unknown;
    if (!j || typeof j !== "object" || Array.isArray(j)) return null;
    const o = j as Record<string, unknown>;
    return cleanNote({ from: typeof o.from === "string" ? o.from : undefined, note: typeof o.note === "string" ? o.note : undefined });
  } catch {
    return null;
  }
}

/** `<secret>` or `<secret>.<note>`: what a link carries after the `#`. */
export function fragmentFor(secret: string, note: Note | null | undefined): string {
  const n = encodeNote(note);
  return n ? `${secret}.${n}` : secret;
}

/** The two parts of a fragment; the secret is checked by `decodeSecret`, the note by `verifiedNote`. */
export function splitFragment(fragment: string | null | undefined): { readonly secret: string; readonly note: string | null } {
  const s = (fragment ?? "").replace(/^#/, "").trim();
  const i = s.indexOf(".");
  return i < 0 ? { secret: s, note: null } : { secret: s.slice(0, i), note: s.slice(i + 1) || null };
}

/** The note a link carries, kept only if the envelope's memo on the ledger is its hash. */
export function verifiedNote(fragment: string | null | undefined, memoHex: string): Note | null {
  const n = decodeNote(splitFragment(fragment).note);
  return n && noteHashHex(n) === memoHex.toLowerCase() ? n : null;
}

/** "Shariq sent you" / "Someone sent you": the line a recipient reads first. */
export function senderWords(n: Note | null | undefined): string {
  return n?.from ? `${n.from} sent you` : "Someone sent you";
}
