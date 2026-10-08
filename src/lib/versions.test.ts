import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** CLAUDE.md §5 "Stack and versions (pinned; a test reads package.json and fails on drift)". */
const ROOT = join(__dirname, "..", "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
const cargo = readFileSync(join(ROOT, "Cargo.toml"), "utf8");
const toolchain = readFileSync(join(ROOT, "rust-toolchain.toml"), "utf8");

describe("the pinned versions", () => {
  it("keeps stellar-sdk at 16.3.1, the range smart-account-kit 0.8.0 accepts", () => {
    expect(pkg.dependencies["@stellar/stellar-sdk"]).toBe("16.3.1");
    expect(pkg.dependencies["smart-account-kit"]).toBe("0.8.0");
  });
  it("installs the wallets kit from JSR at 2.5.0, inside the kit's peer range", () => {
    expect(pkg.dependencies["@creit-tech/stellar-wallets-kit"]).toBe("npm:@jsr/creit-tech__stellar-wallets-kit@2.5.0");
    expect(pkg.dependencies["@creit.tech/stellar-wallets-kit"]).toBeUndefined();
  });
  it("stays on Next 15, the major Scrip's components were written for", () => {
    expect(pkg.dependencies.next).toMatch(/^15\./);
  });
  it("builds the contract with soroban-sdk 28 on a Rust stellar-cli accepts", () => {
    expect(cargo).toMatch(/soroban-sdk = "28\.0\.0"/);
    expect(toolchain).toMatch(/channel = "1\.91\.1"/);
    expect(toolchain).toMatch(/wasm32v1-none/);
  });
});
