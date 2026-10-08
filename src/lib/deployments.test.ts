import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deployment } from "./deployments";

/**
 * THE CONTRACT, NAMED IN THREE PLACES: `deployments/<network>.json` (which every surface and
 * `/proof` read), the README, and the code itself (`artifacts/sown.wasm`). A redeploy that
 * forgets the README, or a rebuild that is not redeployed, fails here.
 */
const ROOT = join(__dirname, "..", "..");

describe("the deployed contract", () => {
  const wasm = readFileSync(join(ROOT, "artifacts", "sown.wasm"));
  const sha = createHash("sha256").update(wasm).digest("hex");

  it("artifacts/sown.wasm.sha256 is the artifact's hash", () => {
    expect(readFileSync(join(ROOT, "artifacts", "sown.wasm.sha256"), "utf8").trim()).toBe(sha);
  });

  for (const net of ["testnet", "mainnet"] as const) {
    const d = deployment(net);
    it.skipIf(!d)(`${net}: runs the repository's code, and the README names it`, () => {
      expect(d!.sha256).toBe(sha);
      expect(d!.bytes).toBe(wasm.length);
      const readme = readFileSync(join(ROOT, "README.md"), "utf8");
      expect(readme).toContain(d!.contractId);
      expect(readme).toContain(d!.sha256);
    });
  }

  it("the README says mainnet is not deployed only while it is not", () => {
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    expect(/\*\*Mainnet contract\*\* \| not deployed yet/.test(readme)).toBe(deployment("mainnet") === null);
  });
});
