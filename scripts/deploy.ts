/**
 * DEPLOY THE SOWN CONTRACT, register its keep assets, and prove the code on chain is ours.
 *
 *   npm run contract:deploy:testnet      # sown-admin from .keys/, XLM stand-in keep asset
 *   SOWN_ADMIN_SECRET=S… SOWN_MAINNET=yes npm run contract:deploy:mainnet
 *
 * Steps: upload artifacts/sown.wasm, create the contract with __constructor(admin, usdc),
 * set_asset for each catalogue row, then dump the code back from the ledger and compare its
 * sha256 with the file. Writes deployments/<network>.json and prints the sha256 for /proof.
 *
 * Mainnet refuses to run without SOWN_MAINNET=yes and a secret in the environment; it never
 * reads a key from disk. This script was written by the agent and not run on mainnet.
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Address, Operation, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { USDC, keepAssets } from "@/lib/assets/catalogue";
import { codeOf } from "@/lib/stellar/code";
import { type NetworkName, baseNetwork } from "@/lib/stellar/network";
import { invokeAs, read } from "@/lib/stellar/soroban";
import { ROOT, keypair, keypairFromEnv } from "./lib/keys";
import { submitOp } from "./lib/submit-op";

async function main() {
  const which = (process.argv[2] ?? "testnet") as NetworkName;
  if (which !== "testnet" && which !== "mainnet") throw new Error("Name a network: testnet or mainnet.");
  if (which === "mainnet" && process.env.SOWN_MAINNET !== "yes") {
    throw new Error("Mainnet deploys need SOWN_MAINNET=yes and SOWN_ADMIN_SECRET in the environment. Read docs/BUILD-PLAN.md first.");
  }
  const net = baseNetwork(which);
  const admin = which === "mainnet" ? keypairFromEnv("SOWN_ADMIN_SECRET") : keypair("sown-admin");
  const usdc = USDC[which];
  const wasm = readFileSync(join(ROOT, "artifacts", "sown.wasm"));
  const sha256 = createHash("sha256").update(wasm).digest("hex");
  console.log(`${which}: deploying artifacts/sown.wasm (${wasm.length} bytes, sha256 ${sha256}) as ${admin.publicKey()}`);

  const upload = await submitOp(net, admin, Operation.uploadContractWasm({ wasm }));
  console.log(`  uploaded: ${upload.hash}`);

  const created = await submitOp(
    net,
    admin,
    Operation.createCustomContract({
      address: Address.fromString(admin.publicKey()),
      wasmHash: Buffer.from(sha256, "hex"),
      salt: randomBytes(32),
      constructorArgs: [Address.fromString(admin.publicKey()).toScVal(), Address.fromString(usdc.sac).toScVal()],
    }),
  );
  const contractId = Address.fromScVal(created.returnValue!).toString();
  console.log(`  contract: ${contractId} (${created.hash}, ledger ${created.ledger})`);

  const assets: Array<{ key: string; sac: string; pool: string; inIdx: number; outIdx: number; tx: string }> = [];
  for (const a of keepAssets(which)) {
    const r = await invokeAs(net, admin, contractId, "set_asset", [
      Address.fromString(a.sac).toScVal(),
      Address.fromString(a.pool).toScVal(),
      nativeToScVal(a.inIdx, { type: "u32" }),
      nativeToScVal(a.outIdx, { type: "u32" }),
      nativeToScVal(true),
    ]);
    if (!r.ok) throw new Error(`set_asset ${a.ticker}: ${r.why}`);
    assets.push({ key: a.key, sac: a.sac, pool: a.pool, inIdx: a.inIdx, outIdx: a.outIdx, tx: r.value.hash });
    console.log(`  set_asset ${a.ticker}: ${r.value.hash}`);
  }

  const onChain = await codeOf(net, contractId);
  if (!onChain.ok) throw new Error(onChain.why);
  const same = onChain.value.sha256 === sha256;
  console.log(`  dumped back: ${onChain.value.bytes} bytes, sha256 ${onChain.value.sha256} — ${same ? "matches the file" : "DOES NOT MATCH"}`);
  if (!same) throw new Error("The code on chain does not match artifacts/sown.wasm.");

  const cfg = await read<Record<string, unknown>>(net, contractId, "config");
  const record = {
    network: which,
    contractId,
    sha256,
    wasmHash: onChain.value.wasmHash,
    bytes: wasm.length,
    admin: admin.publicKey(),
    usdc: usdc.sac,
    assets,
    uploadTx: upload.hash,
    deployTx: created.hash,
    ledger: created.ledger,
    deployedAt: new Date(created.createdAt * 1000).toISOString(),
    config: cfg.ok ? JSON.parse(JSON.stringify(cfg.value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))) : null,
  };
  writeFileSync(join(ROOT, "deployments", `${which}.json`), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`  wrote deployments/${which}.json`);
  void scValToNative;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
