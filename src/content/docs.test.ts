import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOCS } from "./docs";

/** The docs nav and the pages: every /docs/<slug> the app links to exists, and every doc is listed once. */
const ROOT = join(__dirname, "..", "..");
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

describe("the docs", () => {
  it("are the six pages DESIGN.md names, each once", () => {
    expect(DOCS.map((d) => d.slug)).toEqual(["how-a-send-works", "the-envelope", "why-not-claimable-balances", "what-the-issuer-can-do", "fees", "the-limits"]);
  });
  it("answer every link the app makes to them", () => {
    const slugs = new Set(DOCS.map((d) => d.slug));
    const linked = files(join(ROOT, "src")).flatMap((f) => [...readFileSync(f, "utf8").matchAll(/["'`]\/docs\/([a-z0-9-]+)/g)].map((m) => m[1]!));
    expect(linked.length).toBeGreaterThan(0);
    expect(linked.filter((s) => !slugs.has(s))).toEqual([]);
  });
});
