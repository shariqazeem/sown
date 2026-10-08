import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE WORDS ON A SURFACE (CLAUDE.md §8, §11.6; DESIGN.md "The words"). Every string and every
 * piece of JSX text in a page or a component is read here, comments and imports removed, and
 * checked against the words a person or a judge must never read. Code may keep those words;
 * a surface may not.
 */
const ROOT = join(__dirname, "..", "..");
const SURFACES = ["src/app", "src/components"];

const NEVER_ANYWHERE: Array<[string, RegExp]> = [
  ["keeper", /\bkeepers?\b/i],
  ["relayer", /\brelayers?\b/i],
  ["trustline", /\btrust ?lines?\b/i],
  ["token", /\btokens?\b|\btokeni[sz]ed\b/i],
  ["yield", /\byield/i],
  ["APY", /\bAPY\b/],
  ["seed phrase", /\bseed phrases?\b/i],
  ["sponsor", /\bsponsor/i],
  ["gas", /\bgas\b/i],
  ["smart contract", /\bsmart contracts?\b/i],
  ["crank", /\bcrank/i],
  ["escrow", /\bescrow/i],
  ["RWA", /\bRWAs?\b/],
];
// Face ID and fingerprints on consumer surfaces; the mechanism's names in the docs only.
const NOT_OUTSIDE_DOCS: Array<[string, RegExp]> = [
  ["passkey", /\bpasskeys?\b/i],
  ["WebAuthn", /\bwebauthn\b/i],
  ["smart account", /\bsmart accounts?\b/i],
];
// Literals that are code, not words: API kinds and paths.
const CODE_LITERALS = new Set(["trustlines", "passkey", "claim", "move"]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx$/.test(f) ? [p] : [];
  });
}

function surfaceText(src: string): string[] {
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
    .replace(/^\s*import .*$/gm, "");
  const out: string[] = [];
  for (const m of code.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
    const s = m[1] ?? m[2] ?? m[3] ?? "";
    if (CODE_LITERALS.has(s) || /^(\/|https?:|#|\.|@|[a-z-]+\/)/.test(s) || /^[\w-]+(\s[\w-]+)*$/.test(s) && /-/.test(s)) continue;
    out.push(s);
  }
  for (const m of code.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) out.push(m[1]!);
  return out;
}

describe("no surface says what Sown never says", () => {
  for (const dir of SURFACES) {
    for (const file of files(join(ROOT, dir))) {
      const rel = relative(ROOT, file);
      it(rel, () => {
        const text = surfaceText(readFileSync(file, "utf8"));
        const rules = rel.startsWith("src/app/docs") ? NEVER_ANYWHERE : [...NEVER_ANYWHERE, ...NOT_OUTSIDE_DOCS];
        const hits = text.flatMap((t) => rules.filter(([, re]) => re.test(t)).map(([w]) => `"${w}" in: ${t.trim().slice(0, 100)}`));
        expect(hits).toEqual([]);
      });
    }
  }
});

describe("the reader of surfaces", () => {
  it("finds words in JSX text and in strings, and not in comments or imports", () => {
    const t = surfaceText(`import x from "./tokens.css";\n// a keeper\n/* a crank */\nconst a = "the relayer";\nreturn <p className="sw-x">Your token</p>;`).join("|");
    expect(t).toContain("the relayer");
    expect(t).toContain("Your token");
    expect(t).not.toContain("keeper");
    expect(t).not.toContain("crank");
    expect(t).not.toContain("tokens.css");
  });
});
