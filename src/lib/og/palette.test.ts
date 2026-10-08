import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OG, OG_TOKENS } from "./palette";

describe("the share images' colours", () => {
  it("are the token values, read from tokens.css", () => {
    const css = readFileSync(join(__dirname, "..", "..", "styles", "tokens.css"), "utf8");
    for (const [k, token] of Object.entries(OG_TOKENS)) {
      const m = new RegExp(`${token}:\\s*(#[0-9a-f]{6})`, "i").exec(css);
      expect(m?.[1]?.toLowerCase(), token).toBe(OG[k as keyof typeof OG]);
    }
  });
});
