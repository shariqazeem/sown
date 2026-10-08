import { rpc, xdr } from "@stellar/stellar-sdk";
import type { NetworkConfig } from "@/lib/stellar/network";

/**
 * A NETWORK'S RENT, READ FROM ITS OWN CONFIG: the fee per KB of rent (which rises with the live
 * Soroban state size against its target, with a floor of 1,000 stroops), the persistent rent
 * denominator, and the TTL bounds. The same formula as soroban-env-host's
 * `compute_rent_write_fee_per_1kb`.
 */
export type Rent = {
  readonly feePer1Kb: bigint;
  readonly denominator: bigint;
  readonly tempDenominator: bigint;
  readonly stateBytes: bigint;
  readonly targetBytes: bigint;
  readonly minPersistentTtl: number;
  readonly maxEntryTtl: number;
  /** XLM to keep 1 KB in persistent storage for one day (17,280 ledgers). */
  readonly xlmPerKbDay: number;
};

export async function readRent(net: NetworkConfig): Promise<Rent> {
  const server = new rpc.Server(net.rpcUrl);
  const ids = [xdr.ConfigSettingId.configSettingContractLedgerCostV0(), xdr.ConfigSettingId.configSettingLiveSorobanStateSizeWindow(), xdr.ConfigSettingId.configSettingStateArchival()];
  const r = await server.getLedgerEntries(...ids.map((id) => xdr.LedgerKey.configSetting(new xdr.LedgerKeyConfigSetting({ configSettingId: id }))));
  let low = 0n;
  let high = 0n;
  let target = 1n;
  let growth = 0n;
  let size = 0n;
  let denom = 1n;
  let tempDenom = 1n;
  let minTtl = 0;
  let maxTtl = 0;
  for (const e of r.entries) {
    const cs = e.val.configSetting();
    const n = cs.switch().name;
    if (n === "configSettingContractLedgerCostV0") {
      const c = cs.contractLedgerCost();
      low = BigInt(c.rentFee1KbSorobanStateSizeLow().toString());
      high = BigInt(c.rentFee1KbSorobanStateSizeHigh().toString());
      target = BigInt(c.sorobanStateTargetSizeBytes().toString());
      growth = BigInt(c.sorobanStateRentFeeGrowthFactor().toString());
    } else if (n === "configSettingLiveSorobanStateSizeWindow") {
      const w = cs.liveSorobanStateSizeWindow();
      size = w.reduce((a: bigint, v: { toString(): string }) => a + BigInt(v.toString()), 0n) / BigInt(Math.max(1, w.length));
    } else if (n === "configSettingStateArchival") {
      const s = cs.stateArchivalSettings();
      denom = BigInt(s.persistentRentRateDenominator().toString());
      tempDenom = BigInt(s.tempRentRateDenominator().toString());
      minTtl = s.minPersistentTtl();
      maxTtl = s.maxEntryTtl();
    }
  }
  let fee = ((high - low) * size) / target + low;
  if (size > target) fee += (high * growth * (size - target)) / target;
  if (fee < 1_000n) fee = 1_000n;
  return { feePer1Kb: fee, denominator: denom, tempDenominator: tempDenom, stateBytes: size, targetBytes: target, minPersistentTtl: minTtl, maxEntryTtl: maxTtl, xlmPerKbDay: (Number(fee) * 17_280) / Number(denom) / 1e7 };
}
