import { Account, Keypair, Networks, Operation, TransactionBuilder, xdr, Address } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { DAY, explainSendFailure, inspectSignedSend, returnAtFor, sendArgs, validateSend } from "./build";

const CONTRACT = "CBNZK4NDWZZD5YBLK4GTUICA2RF7PIXL7RHADRVQSTYF7EQ4OSCGMOFB";
const KEEP = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const sender = Keypair.random();
const args = { sender: sender.publicKey(), amountRaw: 1_000_000_000n, keepBps: 1_000, keepAsset: KEEP, minKeepOutRaw: 1n, claimKeyHex: "ab".repeat(32), memoHex: "00".repeat(32), returnAt: 2_000_000_000 };

function signedSend(fn = "send", contract = CONTRACT, from = sender) {
  const call = xdr.HostFunction.hostFunctionTypeInvokeContract(new xdr.InvokeContractArgs({ contractAddress: Address.fromString(contract).toScAddress(), functionName: fn, args: sendArgs({ ...args, sender: from.publicKey() }) }));
  const tx = new TransactionBuilder(new Account(from.publicKey(), "1"), { fee: "100", networkPassphrase: Networks.TESTNET }).addOperation(Operation.invokeHostFunction({ func: call, auth: [] })).setTimeout(60).build();
  tx.sign(from);
  return tx.toXDR();
}

describe("a send, before it is built", () => {
  it("accepts a well-formed send and refuses each malformed part", () => {
    expect(validateSend(args).ok).toBe(true);
    expect(validateSend({ ...args, sender: "nope" }).ok).toBe(false);
    expect(validateSend({ ...args, amountRaw: 9_999_999n }).ok).toBe(false);
    expect(validateSend({ ...args, keepBps: 10_001 }).ok).toBe(false);
    expect(validateSend({ ...args, claimKeyHex: "ab" }).ok).toBe(false);
    expect(validateSend({ ...args, minKeepOutRaw: -1n }).ok).toBe(false);
  });
  it("passes the eight arguments in the contract's order and types", () => {
    expect(sendArgs(args).map((a) => a.switch().name)).toEqual(["scvAddress", "scvI128", "scvU32", "scvAddress", "scvI128", "scvBytes", "scvBytes", "scvU64"]);
  });
  it("sets a return date inside the contract's window, with room for the minutes before it lands", () => {
    const now = 1_791_452_102;
    expect(returnAtFor(30, now)).toBe(now + 30 * DAY);
    expect(returnAtFor(1, now)).toBeGreaterThan(now + DAY);
    expect(returnAtFor(365, now)).toBeLessThan(now + 365 * DAY);
  });
});

describe("a signed send, before it is submitted", () => {
  it("is exactly one send on the Sown contract from the wallet that signed it", () => {
    expect(inspectSignedSend(Networks.TESTNET, signedSend(), CONTRACT).ok).toBe(true);
  });
  it("refuses another function, another contract, or garbage", () => {
    expect(inspectSignedSend(Networks.TESTNET, signedSend("refund"), CONTRACT).ok).toBe(false);
    expect(inspectSignedSend(Networks.TESTNET, signedSend("send", KEEP), CONTRACT).ok).toBe(false);
    expect(inspectSignedSend(Networks.TESTNET, "AAAA", CONTRACT).ok).toBe(false);
  });
});

describe("a failed simulation, in the sheet's words", () => {
  it("names the contract's refusals and says nothing moved", () => {
    expect(explainSendFailure("HostError: Error(Contract, #6)")).toBe("The return date must be between one day and one year away. Nothing moved.");
    expect(explainSendFailure("HostError: Error(Contract, #7)")).toContain("not offered");
    expect(explainSendFailure("resulting balance is not within the allowed range")).toContain("does not hold enough USDC");
    expect(explainSendFailure("something new")).toContain("Nothing moved.");
  });
});
