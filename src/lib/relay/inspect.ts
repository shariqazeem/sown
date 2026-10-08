import { Address, StrKey, hash, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import { fromBase64Url } from "@/lib/envelope/claim";
import { type Outcome, held, ok } from "@/lib/outcome";
import type { KitConfig } from "@/lib/passkey/config";

/**
 * THE RELAY SIGNS ONLY WHAT IT HAS INSPECTED. These are the exact shapes Sown's servers will
 * pay for, as pure functions of the bytes a request carries, so a test can feed them every
 * near-miss. Anything that is not exactly one of these is refused before a key is touched.
 *
 *   shape 1  a passkey wallet's deployment: CreateContractV2 of the kit's account wasm, from
 *            the kit's sign-only deployer, with exactly one WebAuthn signer and no policies,
 *            authorised by one deployer entry for that same creation and nothing else
 *   shape 2  a claim: claim(id, to, sig) on the Sown contract, with no authorisation entries
 *            (the link's signature inside the call is the authorisation)
 *   shape 3  sponsored trustlines for a classic wallet (trustlines.ts)
 */

export type ClaimRequest = { readonly id: bigint; readonly to: string; readonly sig: Buffer };

export function parseClaim(raw: { id?: unknown; to?: unknown; sig?: unknown }): Outcome<ClaimRequest> {
  const idText = typeof raw.id === "string" || typeof raw.id === "number" ? String(raw.id) : "";
  if (!/^\d{1,19}$/.test(idText)) return held("That is not an envelope number.");
  const to = typeof raw.to === "string" ? raw.to.trim() : "";
  if (!(StrKey.isValidEd25519PublicKey(to) || StrKey.isValidContract(to))) return held("That is not a Stellar wallet address.");
  const sigText = typeof raw.sig === "string" ? raw.sig.trim() : "";
  const sig = /^[0-9a-f]{128}$/i.test(sigText) ? Buffer.from(sigText, "hex") : /^[A-Za-z0-9_-]{86}$/.test(sigText) ? fromBase64Url(sigText) : null;
  if (!sig || sig.length !== 64) return held("The link's signature is missing or malformed.");
  return ok({ id: BigInt(idText), to, sig });
}

/** Shape 2: the one host function a claim may be. Built here, never accepted from a client. */
export function claimHostFunction(contractId: string, c: ClaimRequest): xdr.HostFunction {
  return xdr.HostFunction.hostFunctionTypeInvokeContract(
    new xdr.InvokeContractArgs({
      contractAddress: Address.fromString(contractId).toScAddress(),
      functionName: "claim",
      args: [nativeToScVal(c.id, { type: "u64" }), Address.fromString(c.to).toScVal(), xdr.ScVal.scvBytes(c.sig)],
    }),
  );
}

/** The address a CreateContractV2 from an account will produce on this network. */
export function derivedContractId(passphrase: string, preimage: xdr.ContractIdPreimage): string {
  const pre = xdr.HashIdPreimage.envelopeTypeContractId(new xdr.HashIdPreimageContractId({ networkId: hash(Buffer.from(passphrase)), contractIdPreimage: preimage }));
  return StrKey.encodeContract(hash(pre.toXDR()));
}

export type DeployInspection = { readonly func: xdr.HostFunction; readonly auth: xdr.SorobanAuthorizationEntry[]; readonly contractId: string };

/** Shape 1. `to` is where the claim will go: the deployment must create exactly that address. */
export function inspectWalletDeploy(kit: KitConfig, passphrase: string, funcB64: unknown, authB64: unknown, to: string): Outcome<DeployInspection> {
  const refuse = (why: string) => held<DeployInspection>(`Sown's servers will not pay for this wallet: ${why}.`);
  if (typeof funcB64 !== "string" || !Array.isArray(authB64) || !authB64.every((a) => typeof a === "string")) return refuse("the request is not a wallet deployment");
  let func: xdr.HostFunction;
  let auth: xdr.SorobanAuthorizationEntry[];
  try {
    func = xdr.HostFunction.fromXDR(funcB64, "base64");
    auth = (authB64 as string[]).map((a) => xdr.SorobanAuthorizationEntry.fromXDR(a, "base64"));
  } catch {
    return refuse("it could not be read");
  }
  if (func.switch().name !== "hostFunctionTypeCreateContractV2") return refuse("it does not create a contract");
  const create = func.createContractV2();
  const pre = create.contractIdPreimage();
  if (pre.switch().name !== "contractIdPreimageFromAddress") return refuse("it does not create from an address");
  const from = Address.fromScAddress(pre.fromAddress().address()).toString();
  if (from !== kit.deployer) return refuse("it is not from the kit's deployer");
  const exec = create.executable();
  if (exec.switch().name !== "contractExecutableWasm" || Buffer.from(exec.wasmHash()).toString("hex") !== kit.accountWasmHash) return refuse("it is not the audited account code");

  const args = create.constructorArgs();
  if (args.length !== 2) return refuse("its setup is not one passkey and no policies");
  const [signersVal, policiesVal] = args as [xdr.ScVal, xdr.ScVal];
  if (signersVal.switch().name !== "scvVec" || policiesVal.switch().name !== "scvMap") return refuse("its setup is not one passkey and no policies");
  const signers = signersVal.vec() ?? [];
  const policies = policiesVal.map() ?? [];
  if (signers.length !== 1 || policies.length !== 0) return refuse("its setup is not one passkey and no policies");
  const signer = signers[0]!;
  const parts = signer.switch().name === "scvVec" ? (signer.vec() ?? []) : [];
  if (parts.length !== 3) return refuse("its signer is not a passkey");
  const [tag, verifier, keyData] = parts as [xdr.ScVal, xdr.ScVal, xdr.ScVal];
  if (tag.switch().name !== "scvSymbol" || tag.sym().toString() !== "External") return refuse("its signer is not a passkey");
  if (verifier.switch().name !== "scvAddress" || Address.fromScAddress(verifier.address()).toString() !== kit.webauthnVerifier) return refuse("its signer is not checked by the WebAuthn verifier");
  if (keyData.switch().name !== "scvBytes") return refuse("its passkey key is malformed");
  const key = Buffer.from(keyData.bytes());
  if (key.length < 66 || key.length > 65 + 255 || key[0] !== 0x04) return refuse("its passkey key is malformed");

  if (auth.length !== 1) return refuse("it carries other authorisations");
  const entry = auth[0]!;
  if (entry.credentials().switch().name !== "sorobanCredentialsAddress") return refuse("it carries other authorisations");
  if (Address.fromScAddress(entry.credentials().address().address()).toString() !== kit.deployer) return refuse("it carries other authorisations");
  const root = entry.rootInvocation();
  if (root.subInvocations().length !== 0) return refuse("it authorises more than the deployment");
  const fn = root.function();
  if (fn.switch().name !== "sorobanAuthorizedFunctionTypeCreateContractV2HostFn") return refuse("it authorises something else");
  if (!Buffer.from(fn.createContractV2HostFn().toXDR()).equals(Buffer.from(create.toXDR()))) return refuse("its authorisation is for another deployment");

  const contractId = derivedContractId(passphrase, pre);
  if (contractId !== to) return refuse("it would create a different wallet from the one the claim names");
  return ok({ func, auth, contractId });
}

/** For a log line or a test: what a host function calls, in words. */
export function describeHostFunction(func: xdr.HostFunction): string {
  if (func.switch().name === "hostFunctionTypeInvokeContract") {
    const i = func.invokeContract();
    return `${Address.fromScAddress(i.contractAddress()).toString()}.${i.functionName().toString()}(${i.args().map((a) => JSON.stringify(scValToNative(a), (_k, v) => (typeof v === "bigint" ? v.toString() : v))).join(", ")})`;
  }
  return func.switch().name;
}

export type MoveInspection = {
  readonly func: xdr.HostFunction;
  readonly auth: xdr.SorobanAuthorizationEntry[];
  readonly token: string;
  readonly from: string;
  readonly to: string;
  readonly amount: bigint;
};

/**
 * Shape 4: a recipient moves what they hold out of their passkey wallet. Exactly one token
 * `transfer(from, to, amount)` on one of Sown's own assets (USDC or a keep asset), from a C-address,
 * authorised by one entry for `from` covering exactly that call and nothing beneath it. Whether
 * `from` is a passkey wallet that claimed a Sown envelope is checked against the chain by the
 * handler; this checks only the bytes.
 */
export function inspectMove(tokens: readonly string[], funcB64: unknown, authB64: unknown): Outcome<MoveInspection> {
  const refuse = (why: string) => held<MoveInspection>(`Sown's servers will not pay for this move: ${why}.`);
  if (typeof funcB64 !== "string" || !Array.isArray(authB64) || !authB64.every((a) => typeof a === "string")) return refuse("the request is not a transfer");
  let func: xdr.HostFunction;
  let auth: xdr.SorobanAuthorizationEntry[];
  try {
    func = xdr.HostFunction.fromXDR(funcB64, "base64");
    auth = (authB64 as string[]).map((a) => xdr.SorobanAuthorizationEntry.fromXDR(a, "base64"));
  } catch {
    return refuse("it could not be read");
  }
  if (func.switch().name !== "hostFunctionTypeInvokeContract") return refuse("it is not a contract call");
  const call = func.invokeContract();
  const token = Address.fromScAddress(call.contractAddress()).toString();
  if (!tokens.includes(token)) return refuse("it moves something Sown did not send");
  if (call.functionName().toString() !== "transfer") return refuse("it is not a transfer");
  const args = call.args();
  if (args.length !== 3 || args[0]!.switch().name !== "scvAddress" || args[1]!.switch().name !== "scvAddress" || args[2]!.switch().name !== "scvI128") return refuse("its arguments are not a transfer's");
  const from = Address.fromScAddress(args[0]!.address()).toString();
  const to = Address.fromScAddress(args[1]!.address()).toString();
  const amount = BigInt(scValToNative(args[2]!) as bigint);
  if (!from.startsWith("C")) return refuse("it is not from a passkey wallet");
  if (amount <= 0n) return refuse("it moves nothing");
  if (from === to) return refuse("it moves to itself");
  if (auth.length !== 1) return refuse("it carries other authorisations");
  const entry = auth[0]!;
  if (entry.credentials().switch().name !== "sorobanCredentialsAddress" || Address.fromScAddress(entry.credentials().address().address()).toString() !== from) return refuse("it is not authorised by the wallet it moves from");
  const root = entry.rootInvocation();
  if (root.subInvocations().length !== 0) return refuse("it authorises more than the transfer");
  const fn = root.function();
  if (fn.switch().name !== "sorobanAuthorizedFunctionTypeContractFn") return refuse("it authorises something else");
  if (!Buffer.from(fn.contractFn().toXDR()).equals(Buffer.from(call.toXDR()))) return refuse("its authorisation is for another call");
  return ok({ func, auth, token, from, to, amount });
}
