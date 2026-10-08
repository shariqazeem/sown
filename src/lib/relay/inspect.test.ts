import { Account, Address, Asset, Keypair, Memo, Networks, Operation, TransactionBuilder, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { KIT } from "@/lib/passkey/config";
import fixtures from "./fixtures/testnet.json";
import { claimHostFunction, derivedContractId, inspectMove, inspectWalletDeploy, parseClaim } from "./inspect";
import { buildTrustlineTx, inspectSignedTrustlineTx, trustlineOps } from "./trustlines";

const PASS = Networks.TESTNET;
const kit = KIT.testnet;
// The wallet Smoke 1 deployed from exactly this request (tx e02290cb…).
const DEPLOYED = "CDBTEAVSV6F2XWDVWZ4IYOERAZHXDYUXXOALXTRFZOKLMVRF7A5JSCPY";
const XLM = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const USDC = "CAZRY5GSFBFXD7H6GAFBA5YGYQTDXU4QKWKMYFWBAZFUCURN3WKX6LF5";
const deploy = fixtures.deploy;
const move = fixtures.move;

const fn = (b64: string) => xdr.HostFunction.fromXDR(b64, "base64");
const entry = (b64: string) => xdr.SorobanAuthorizationEntry.fromXDR(b64, "base64");

/** A copy of the recorded deployment with one part of its creation changed. */
function mutatedDeploy(change: (c: xdr.CreateContractArgsV2) => xdr.CreateContractArgsV2): string {
  const create = fn(deploy.func).createContractV2();
  return xdr.HostFunction.hostFunctionTypeCreateContractV2(change(create)).toXDR("base64");
}

describe("shape 1: a passkey wallet's deployment", () => {
  it("accepts exactly the deployment the kit builds, for the wallet the claim names", () => {
    const r = inspectWalletDeploy(kit, PASS, deploy.func, deploy.auth, DEPLOYED);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.contractId).toBe(DEPLOYED);
  });
  it("derives the same address the network did", () => {
    expect(derivedContractId(PASS, fn(deploy.func).createContractV2().contractIdPreimage())).toBe(DEPLOYED);
  });
  it("refuses a deployment that would create a different wallet from the claim's", () => {
    const r = inspectWalletDeploy(kit, PASS, deploy.func, deploy.auth, XLM);
    expect(r.ok).toBe(false);
  });
  it("refuses other code", () => {
    const other = mutatedDeploy((c) => new xdr.CreateContractArgsV2({ contractIdPreimage: c.contractIdPreimage(), executable: xdr.ContractExecutable.contractExecutableWasm(Buffer.alloc(32, 7)), constructorArgs: c.constructorArgs() }));
    expect(inspectWalletDeploy(kit, PASS, other, deploy.auth, DEPLOYED).ok).toBe(false);
  });
  it("refuses a second signer, a policy, or a signer checked by another verifier", () => {
    const create = fn(deploy.func).createContractV2();
    const [signers] = create.constructorArgs() as [xdr.ScVal, xdr.ScVal];
    const one = signers.vec()![0]!;
    const twoSigners = mutatedDeploy((c) => new xdr.CreateContractArgsV2({ contractIdPreimage: c.contractIdPreimage(), executable: c.executable(), constructorArgs: [xdr.ScVal.scvVec([one, one]), c.constructorArgs()[1]!] }));
    expect(inspectWalletDeploy(kit, PASS, twoSigners, deploy.auth, DEPLOYED).ok).toBe(false);
    const withPolicy = mutatedDeploy(
      (c) =>
        new xdr.CreateContractArgsV2({
          contractIdPreimage: c.contractIdPreimage(),
          executable: c.executable(),
          constructorArgs: [c.constructorArgs()[0]!, xdr.ScVal.scvMap([new xdr.ScMapEntry({ key: Address.fromString(XLM).toScVal(), val: xdr.ScVal.scvVoid() })])],
        }),
    );
    expect(inspectWalletDeploy(kit, PASS, withPolicy, deploy.auth, DEPLOYED).ok).toBe(false);
    const parts = one.vec()!;
    const otherVerifier = xdr.ScVal.scvVec([parts[0]!, Address.fromString(XLM).toScVal(), parts[2]!]);
    const badVerifier = mutatedDeploy((c) => new xdr.CreateContractArgsV2({ contractIdPreimage: c.contractIdPreimage(), executable: c.executable(), constructorArgs: [xdr.ScVal.scvVec([otherVerifier]), c.constructorArgs()[1]!] }));
    expect(inspectWalletDeploy(kit, PASS, badVerifier, deploy.auth, DEPLOYED).ok).toBe(false);
  });
  it("refuses extra or foreign authorisations, and anything that is not a deployment", () => {
    expect(inspectWalletDeploy(kit, PASS, deploy.func, [...deploy.auth, ...deploy.auth], DEPLOYED).ok).toBe(false);
    expect(inspectWalletDeploy(kit, PASS, deploy.func, [], DEPLOYED).ok).toBe(false);
    expect(inspectWalletDeploy(kit, PASS, move.func, deploy.auth, DEPLOYED).ok).toBe(false);
    expect(inspectWalletDeploy(kit, PASS, "not xdr", deploy.auth, DEPLOYED).ok).toBe(false);
    expect(inspectWalletDeploy(kit, PASS, deploy.func, "not a list", DEPLOYED).ok).toBe(false);
    // The deployer's authorisation for another deployment: the move fixture's auth is not it.
    expect(inspectWalletDeploy(kit, PASS, deploy.func, move.auth, DEPLOYED).ok).toBe(false);
  });
  it("refuses a deployment authorised for a different creation than the one submitted", () => {
    const e = entry(deploy.auth[0]!);
    const altered = mutatedDeploy((c) => {
      const pre = c.contractIdPreimage().fromAddress();
      return new xdr.CreateContractArgsV2({
        contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(new xdr.ContractIdPreimageFromAddress({ address: pre.address(), salt: Buffer.alloc(32, 9) })),
        executable: c.executable(),
        constructorArgs: c.constructorArgs(),
      });
    });
    const to = derivedContractId(PASS, fn(altered).createContractV2().contractIdPreimage());
    expect(inspectWalletDeploy(kit, PASS, altered, [e.toXDR("base64")], to).ok).toBe(false);
  });
});

describe("shape 2: a claim", () => {
  const sig = Buffer.alloc(64, 3);
  it("reads an envelope number, a wallet address and a 64-byte signature", () => {
    const r = parseClaim({ id: "12", to: DEPLOYED, sig: sig.toString("hex") });
    expect(r.ok).toBe(true);
    if (r.ok) expect([r.value.id, r.value.to, r.value.sig.length]).toEqual([12n, DEPLOYED, 64]);
    expect(parseClaim({ id: 12, to: Keypair.random().publicKey(), sig: sig.toString("base64url") }).ok).toBe(true);
  });
  it("refuses anything else", () => {
    expect(parseClaim({ id: "-1", to: DEPLOYED, sig: sig.toString("hex") }).ok).toBe(false);
    expect(parseClaim({ id: "1e3", to: DEPLOYED, sig: sig.toString("hex") }).ok).toBe(false);
    expect(parseClaim({ id: "1", to: "GNOTANADDRESS", sig: sig.toString("hex") }).ok).toBe(false);
    expect(parseClaim({ id: "1", to: DEPLOYED, sig: sig.subarray(0, 63).toString("hex") }).ok).toBe(false);
    expect(parseClaim({ id: "1", to: DEPLOYED }).ok).toBe(false);
  });
  it("is built here as exactly claim(id, to, sig) on the Sown contract, never taken from a client", () => {
    const f = claimHostFunction(XLM, { id: 7n, to: DEPLOYED, sig });
    const call = f.invokeContract();
    expect(Address.fromScAddress(call.contractAddress()).toString()).toBe(XLM);
    expect(call.functionName().toString()).toBe("claim");
    expect(call.args().map((a) => a.switch().name)).toEqual(["scvU64", "scvAddress", "scvBytes"]);
  });
});

describe("shape 4: moving out of a passkey wallet", () => {
  const tokens = [USDC, XLM];
  it("accepts the recorded move: one transfer from the wallet, authorised by it alone", () => {
    const r = inspectMove(tokens, move.func, move.auth);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.token).toBe(XLM);
      expect(r.value.from.startsWith("C")).toBe(true);
      expect(r.value.amount).toBe(50_000_000n);
    }
  });
  it("refuses a token Sown did not send", () => {
    expect(inspectMove([USDC], move.func, move.auth).ok).toBe(false);
  });
  it("refuses a call the authorisation does not cover", () => {
    const call = fn(move.func).invokeContract();
    const [from, to] = call.args() as [xdr.ScVal, xdr.ScVal, xdr.ScVal];
    const more = xdr.HostFunction.hostFunctionTypeInvokeContract(new xdr.InvokeContractArgs({ contractAddress: call.contractAddress(), functionName: "transfer", args: [from, to, nativeToScVal(999_000_000n, { type: "i128" })] }));
    expect(inspectMove(tokens, more.toXDR("base64"), move.auth).ok).toBe(false);
    const approve = xdr.HostFunction.hostFunctionTypeInvokeContract(new xdr.InvokeContractArgs({ contractAddress: call.contractAddress(), functionName: "approve", args: call.args() }));
    expect(inspectMove(tokens, approve.toXDR("base64"), move.auth).ok).toBe(false);
  });
  it("refuses extra authorisations and malformed requests", () => {
    expect(inspectMove(tokens, move.func, [...move.auth, ...move.auth]).ok).toBe(false);
    expect(inspectMove(tokens, move.func, []).ok).toBe(false);
    expect(inspectMove(tokens, deploy.func, deploy.auth).ok).toBe(false);
    expect(inspectMove(tokens, 42, move.auth).ok).toBe(false);
  });
});

describe("shape 3: a classic wallet's sponsored trustlines", () => {
  const sponsor = Keypair.random();
  const wallet = Keypair.random();
  const need = { exists: false, assets: [new Asset("USDC", "GAHPYWLK6YRN7CVYZOO4H3VDRZ7PVF5UJGLZCSPAEIKJE2XSWF5LAGER")] };
  const build = () => buildTrustlineTx(PASS, new Account(sponsor.publicKey(), "100"), wallet.publicKey(), need);

  it("is exactly: begin sponsoring, create the account, the trustlines, end sponsoring", () => {
    const ops = trustlineOps(wallet.publicKey(), need).map((o) => o.body().switch().name);
    expect(ops).toEqual(["beginSponsoringFutureReserves", "createAccount", "changeTrust", "endSponsoringFutureReserves"]);
    expect(trustlineOps(wallet.publicKey(), { exists: true, assets: need.assets }).map((o) => o.body().switch().name)).toEqual(["beginSponsoringFutureReserves", "changeTrust", "endSponsoringFutureReserves"]);
  });
  it("accepts the wallet's signed copy of the transaction it built", () => {
    const tx = build();
    tx.sign(wallet);
    expect(inspectSignedTrustlineTx(PASS, tx.toXDR(), sponsor.publicKey(), wallet.publicKey(), need).ok).toBe(true);
  });
  it("refuses it unsigned, signed by someone else, or already carrying the sponsor's signature", () => {
    const unsigned = build();
    expect(inspectSignedTrustlineTx(PASS, unsigned.toXDR(), sponsor.publicKey(), wallet.publicKey(), need).ok).toBe(false);
    const other = build();
    other.sign(Keypair.random());
    expect(inspectSignedTrustlineTx(PASS, other.toXDR(), sponsor.publicKey(), wallet.publicKey(), need).ok).toBe(false);
    const both = build();
    both.sign(wallet);
    both.sign(sponsor);
    expect(inspectSignedTrustlineTx(PASS, both.toXDR(), sponsor.publicKey(), wallet.publicKey(), need).ok).toBe(false);
  });
  it("refuses an added operation, another source, a fee above the cap, a memo, or a late expiry", () => {
    const sign = (t: ReturnType<typeof build>) => {
      t.sign(wallet);
      return t.toXDR();
    };
    const extra = TransactionBuilder.cloneFrom(build()).addOperation(Operation.payment({ destination: wallet.publicKey(), asset: Asset.native(), amount: "100", source: sponsor.publicKey() })).build();
    expect(inspectSignedTrustlineTx(PASS, sign(extra), sponsor.publicKey(), wallet.publicKey(), need).ok).toBe(false);
    const elsewhere = buildTrustlineTx(PASS, new Account(Keypair.random().publicKey(), "1"), wallet.publicKey(), need);
    expect(inspectSignedTrustlineTx(PASS, sign(elsewhere), sponsor.publicKey(), wallet.publicKey(), need).ok).toBe(false);
    const pricey = TransactionBuilder.cloneFrom(build(), { fee: "100000" }).build();
    expect(inspectSignedTrustlineTx(PASS, sign(pricey), sponsor.publicKey(), wallet.publicKey(), need).ok).toBe(false);
    const memo = TransactionBuilder.cloneFrom(build()).addMemo(Memo.text("hi")).build();
    expect(inspectSignedTrustlineTx(PASS, sign(memo), sponsor.publicKey(), wallet.publicKey(), need).ok).toBe(false);
    const now = Math.floor(Date.now() / 1000);
    expect(inspectSignedTrustlineTx(PASS, sign(build()), sponsor.publicKey(), wallet.publicKey(), need, now + 3_600).ok).toBe(false);
  });
  it("refuses a transaction for a different set of trustlines than the wallet needs", () => {
    const tx = build();
    tx.sign(wallet);
    expect(inspectSignedTrustlineTx(PASS, tx.toXDR(), sponsor.publicKey(), wallet.publicKey(), { exists: true, assets: need.assets }).ok).toBe(false);
  });
});
