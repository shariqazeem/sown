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
const SURFACES = ["src/app", "src/components", "src/content"];

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
  ["reserve", /\breserves?\b/i],
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
    // A template's own text only: its ${…} parts are code.
    const s = m[1] ?? m[2] ?? (m[3] ?? "").replace(/\$\{[^}]*\}/g, " ");
    if (CODE_LITERALS.has(s) || /^(\/|https?:|#|\.|@|[a-z-]+\/)/.test(s) || /^[\w-]+(\s[\w-]+)*$/.test(s) && /-/.test(s)) continue;
    out.push(s);
  }
  // JSX text: any run between a tag or an expression and the next one. A run that reads as code
  // (a declaration, an arrow, a comparison) is code between two braces, not words.
  for (const m of code.matchAll(/[>}]([^<>{}]*[A-Za-z][^<>{}]*)[<{]/g)) {
    if (/\b(const|let|return|await|import|export|function|if|else)\b|=>|===|!==|\?\?|&&|\|\|/.test(m[1]!)) continue;
    out.push(m[1]!);
  }
  return out;
}

describe("no surface says what Sown never says", () => {
  for (const dir of SURFACES) {
    for (const file of files(join(ROOT, dir))) {
      const rel = relative(ROOT, file);
      it(rel, () => {
        const text = surfaceText(readFileSync(file, "utf8"));
        const rules = rel.startsWith("src/app/docs") || rel.startsWith("src/content/docs") ? NEVER_ANYWHERE : [...NEVER_ANYWHERE, ...NOT_OUTSIDE_DOCS];
        const hits = text.flatMap((t) => rules.filter(([, re]) => re.test(t)).map(([w]) => `"${w}" in: ${t.trim().slice(0, 100)}`));
        expect(hits).toEqual([]);
      });
    }
  }
});

describe("the catalogue's words, printed on every asset row", () => {
  it("say nothing Sown never says", async () => {
    const { CATALOGUE } = await import("@/lib/assets/catalogue");
    const rules = [...NEVER_ANYWHERE, ...NOT_OUTSIDE_DOCS];
    const text = [...CATALOGUE.mainnet, ...CATALOGUE.testnet].flatMap((a) => [a.name, a.fullName, a.quote, a.quoteSourceLabel, a.issuerName]);
    const hits = text.flatMap((t) => rules.filter(([, re]) => re.test(t)).map(([w]) => `"${w}" in: ${t}`));
    expect(hits).toEqual([]);
  });
});

describe("the evidence /proof prints", () => {
  const rules = [...NEVER_ANYWHERE, ...NOT_OUTSIDE_DOCS];
  it("names every battery and smoke step in surface words", () => {
    const names = ["testnet-battery.json", "testnet-smoke.json", "mainnet-smoke.json"].flatMap((f) => (JSON.parse(readFileSync(join(ROOT, "deployments", f), "utf8")) as { steps: Array<{ name: string }> }).steps.map((s) => s.name));
    const hits = names.flatMap((n) => rules.filter(([, re]) => re.test(n)).map(([w]) => `"${w}" in: ${n}`));
    expect(hits).toEqual([]);
  });
  it("prints nothing else Sown never says", async () => {
    const { evidenceWords } = await import("@/lib/evidence");
    const hits = evidenceWords().flatMap((t) => rules.filter(([, re]) => re.test(t)).map(([w]) => `"${w}" in: ${t}`));
    expect(hits).toEqual([]);
  });
});

describe("the README, which a judge reads first", () => {
  it("says nothing Sown never says (the mechanism's names are allowed, as in the docs)", () => {
    const text = readFileSync(join(ROOT, "README.md"), "utf8")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]*`/g, "")
      .replace(/\([^)]*\)/g, (m) => (/^\((https?:|\.\/|[\w-]+\/)/.test(m) ? "" : m));
    const hits = text.split("\n").flatMap((line) => NEVER_ANYWHERE.filter(([, re]) => re.test(line)).map(([w]) => `"${w}" in: ${line.trim().slice(0, 100)}`));
    expect(hits).toEqual([]);
  });
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
  it("finds words in JSX text that sits beside an expression", () => {
    const t = surfaceText(`return <p>They hold {n} XLM and the reserves {x} it needs.</p>;`).join("|");
    expect(t).toContain("XLM and the reserves");
    expect(t).toContain("it needs.");
  });
});
