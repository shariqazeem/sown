import { describe, expect, it } from "vitest";
import { decodeSecret, encodeSecret, newSecret } from "./claim";
import { NO_NOTE_HEX, cleanNote, decodeNote, encodeNote, fragmentFor, noteHashHex, senderWords, splitFragment, verifiedNote } from "./note";

describe("the note that travels with the link", () => {
  it("is trimmed, limited and keyed in a fixed order, so its hash is one thing", () => {
    expect(cleanNote({ from: "  Shariq   Azeem ", note: " For  school\nfees " })).toEqual({ from: "Shariq Azeem", note: "For school fees" });
    expect(cleanNote({ from: "", note: "   " })).toBeNull();
    expect(cleanNote(null)).toBeNull();
    expect(cleanNote({ note: "x".repeat(500) })!.note).toHaveLength(140);
    expect(noteHashHex({ note: "For school fees", from: "Shariq" })).toBe(noteHashHex({ from: "Shariq", note: "For school fees" }));
    expect(noteHashHex({ from: " Shariq " })).toBe(noteHashHex({ from: "Shariq" }));
  });
  it("hashes to zeros when there is no note, which is what an envelope without one holds", () => {
    expect(noteHashHex(null)).toBe(NO_NOTE_HEX);
    expect(noteHashHex({ from: "" })).toBe(NO_NOTE_HEX);
    expect(noteHashHex({ from: "Ammi" })).toMatch(/^[0-9a-f]{64}$/);
    expect(noteHashHex({ from: "Ammi" })).not.toBe(noteHashHex({ from: "Abbu" }));
  });
  it("round-trips through the fragment after the secret, and the secret still decodes", () => {
    const secret = newSecret();
    const s = encodeSecret(secret);
    const f = fragmentFor(s, { from: "Shariq", note: "For school fees" });
    expect(f.startsWith(`${s}.`)).toBe(true);
    expect(fragmentFor(s, null)).toBe(s);
    const parts = splitFragment(`#${f}`);
    expect(parts.secret).toBe(s);
    expect(decodeNote(parts.note)).toEqual({ from: "Shariq", note: "For school fees" });
    expect(Buffer.from(decodeSecret(`#${f}`)!)).toEqual(Buffer.from(secret));
    expect(Buffer.from(decodeSecret(f)!)).toEqual(Buffer.from(secret));
  });
  it("is shown only when the ledger's memo is its hash", () => {
    const s = encodeSecret(newSecret());
    const note = { from: "Shariq", note: "For school fees" };
    const f = fragmentFor(s, note);
    expect(verifiedNote(f, noteHashHex(note))).toEqual(note);
    expect(verifiedNote(f, noteHashHex({ from: "Shariq", note: "For rent" }))).toBeNull();
    expect(verifiedNote(f, NO_NOTE_HEX)).toBeNull();
    expect(verifiedNote(s, NO_NOTE_HEX)).toBeNull();
    expect(verifiedNote(`${s}.not-base64-json`, noteHashHex(note))).toBeNull();
  });
  it("refuses what is not a note", () => {
    expect(decodeNote(null)).toBeNull();
    expect(decodeNote("")).toBeNull();
    expect(decodeNote(encodeNote({ from: "x" })!.slice(0, 3))).toBeNull();
    expect(decodeNote("W10")).toBeNull(); // "[]"
    expect(decodeNote("a".repeat(2_000))).toBeNull();
  });
  it("says who sent it, or that someone did", () => {
    expect(senderWords({ from: "Shariq" })).toBe("Shariq sent you");
    expect(senderWords(null)).toBe("Someone sent you");
    expect(senderWords({ note: "hi" })).toBe("Someone sent you");
  });
});
