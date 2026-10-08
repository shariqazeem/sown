/**
 * DAY-0 SMOKE 2 — AQUARIUS FROM A G-ACCOUNT, AND THE AUTH TREE A SWAP NEEDS.
 *
 * On testnet: give the sender test USDC (Aquarius's own, issued by GAHPYWLK…, bought with
 * Friendbot XLM through the pool), then swap 1 USDC → XLM with estimate_swap then swap, and
 * print the authorisation tree the simulation records for `swap(user, …)`. That tree decides
 * the `authorize_as_current_contract` entry the Sown contract writes before it calls the pool.
 *
 *   npx tsx scripts/smoke/aquarius-testnet.ts
 */
import { Asset, BASE_FEE, Operation, TransactionBuilder, nativeToScVal, rpc, scValToNative, xdr, Address } from "@stellar/stellar-sdk";
import { baseNetwork } from "@/lib/stellar/network";
import { invokeAs, read, rpcServer, sendAndWait, simulate } from "@/lib/stellar/soroban";
import { keypair } from "../lib/keys";

const net = baseNetwork("testnet");
const POOL = "CD3LFMMLBQ6RBJUD3Z2LFDFE6544WDRMWHEZYPI5YDVESYRSO2TT32BX";
const USDC = "CAZRY5GSFBFXD7H6GAFBA5YGYQTDXU4QKWKMYFWBAZFUCURN3WKX6LF5"; // USDC:GAHPYWLK… SAC
const XLM = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const ISSUER = "GAHPYWLK6YRN7CVYZOO4H3VDRZ7PVF5UJGLZCSPAEIKJE2XSWF5LAGER";

const u32 = (n: number) => nativeToScVal(n, { type: "u32" });
const u128 = (n: bigint) => nativeToScVal(n, { type: "u128" });
const i7 = (n: bigint) => (Number(n) / 1e7).toFixed(7);

function tree(inv: xdr.SorobanAuthorizedInvocation, depth = 0): string[] {
  const f = inv.function();
  const pad = "  ".repeat(depth);
  let line: string;
  if (f.switch().name === "sorobanAuthorizedFunctionTypeContractFn") {
    const c = f.contractFn();
    const args = c.args().map((a) => {
      const v = scValToNative(a);
      return typeof v === "bigint" ? v.toString() : JSON.stringify(v);
    });
    line = `${pad}${Address.fromScAddress(c.contractAddress()).toString()}.${c.functionName().toString()}(${args.join(", ")})`;
  } else {
    line = `${pad}${f.switch().name}`;
  }
  return [line, ...inv.subInvocations().flatMap((s) => tree(s, depth + 1))];
}

async function balance(token: string, who: string): Promise<bigint> {
  const r = await read<bigint>(net, token, "balance", [Address.fromString(who).toScVal()]);
  return r.ok ? BigInt(r.value) : 0n;
}

async function main() {
  const sender = keypair("sown-sender");
  const me = sender.publicKey();
  const server = rpcServer(net);
  console.log("sender", me);

  const tokens = await read<string[]>(net, POOL, "get_tokens");
  console.log("pool tokens", tokens.ok ? tokens.value : tokens.why);

  // 1. A trustline to the pool's USDC, so a G-account can hold it.
  if ((await balance(USDC, me)) === 0n) {
    const acct = await server.getAccount(me);
    const tx = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase: net.passphrase })
      .addOperation(Operation.changeTrust({ asset: new Asset("USDC", ISSUER) }))
      .setTimeout(60)
      .build();
    tx.sign(sender);
    const t = await sendAndWait(net, tx);
    console.log("trustline", t.ok ? t.value.hash : t.why);
  }

  // 2. Test USDC, bought with Friendbot XLM through the same pool (XLM is index 1, USDC 0).
  if ((await balance(USDC, me)) < 30_0000000n) {
    const xlmIn = 3_000_0000000n;
    const est = await simulate(net, POOL, "estimate_swap", [u32(1), u32(0), u128(xlmIn)]);
    if (!est.ok) throw new Error(est.why);
    const out = BigInt(scValToNative(est.value.retval!));
    const min = (out * 99n) / 100n;
    const s = await invokeAs(net, sender, POOL, "swap", [Address.fromString(me).toScVal(), u32(1), u32(0), u128(xlmIn), u128(min)]);
    console.log(`bought USDC: ${i7(xlmIn)} XLM → about ${i7(out)} USDC`, s.ok ? s.value.hash : s.why);
  }
  console.log("sender USDC", i7(await balance(USDC, me)));

  // 3. 1 USDC → XLM: estimate, then read the auth tree the swap simulation records.
  const oneUsdc = 1_0000000n;
  const est = await simulate(net, POOL, "estimate_swap", [u32(0), u32(1), u128(oneUsdc)]);
  if (!est.ok) throw new Error(est.why);
  const quoted = BigInt(scValToNative(est.value.retval!));
  console.log(`estimate_swap(0, 1, 1 USDC) = ${i7(quoted)} XLM`);
  const min = (quoted * 99n) / 100n;
  const swapArgs = [Address.fromString(me).toScVal(), u32(0), u32(1), u128(oneUsdc), u128(min)];
  const sim = await simulate(net, POOL, "swap", swapArgs, { source: me });
  if (!sim.ok) throw new Error(sim.why);
  console.log("\nAUTH TREE recorded for swap(user = G-account):");
  for (const entry of sim.value.sim.result?.auth ?? []) {
    const cred = entry.credentials().switch().name;
    console.log(`  credentials: ${cred}`);
    for (const l of tree(entry.rootInvocation())) console.log("   ", l);
  }
  console.log("  cost:", JSON.stringify(sim.value.sim.cost), "minResourceFee:", sim.value.sim.minResourceFee);

  // 4. Do it.
  const done = await invokeAs(net, sender, POOL, "swap", swapArgs);
  if (!done.ok) throw new Error(done.why);
  const got = done.value.returnValue ? BigInt(scValToNative(done.value.returnValue)) : null;
  console.log(`\nswap landed: ${done.value.hash} ledger ${done.value.ledger}; received ${got === null ? "?" : i7(got)} XLM (min ${i7(min)})`);
  console.log(`${net.explorer}/tx/${done.value.hash}`);
  void rpc;
  void XLM;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
