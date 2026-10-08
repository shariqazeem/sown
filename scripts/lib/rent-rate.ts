// Debugging aid: the rent rate each network charges right now, from its own config settings.
import { rpc, xdr } from "@stellar/stellar-sdk";
for (const url of ["https://soroban-testnet.stellar.org", "https://mainnet.sorobanrpc.com"]) {
  const server = new rpc.Server(url);
  const ids = [xdr.ConfigSettingId.configSettingContractLedgerCostV0(), xdr.ConfigSettingId.configSettingLiveSorobanStateSizeWindow(), xdr.ConfigSettingId.configSettingStateArchival()];
  const r = await server.getLedgerEntries(...ids.map((id) => xdr.LedgerKey.configSetting(new xdr.LedgerKeyConfigSetting({ configSettingId: id }))));
  let low = 0n, high = 0n, target = 0n, growth = 0n, size = 0n, denom = 0n;
  for (const e of r.entries) {
    const cs = e.val.configSetting();
    const n = cs.switch().name;
    if (n === "configSettingContractLedgerCostV0") {
      const c = cs.contractLedgerCost();
      low = BigInt(c.rentFee1KbSorobanStateSizeLow().toString()); high = BigInt(c.rentFee1KbSorobanStateSizeHigh().toString()); target = BigInt(c.sorobanStateTargetSizeBytes().toString()); growth = BigInt(c.sorobanStateRentFeeGrowthFactor().toString());
    } else if (n === "configSettingLiveSorobanStateSizeWindow") {
      const w = cs.liveSorobanStateSizeWindow();
      size = w.reduce((a: bigint, v: { toString(): string }) => a + BigInt(v.toString()), 0n) / BigInt(w.length);
    } else if (n === "configSettingStateArchival") {
      denom = BigInt(cs.stateArchivalSettings().persistentRentRateDenominator().toString());
    }
  }
  let fee = ((high - low) * size) / target + low;
  if (size > target) fee += (high * growth * (size - target)) / target;
  if (fee < 1000n) fee = 1000n;
  const perKbDay = (Number(fee) * 17280) / (1024 * Number(denom)) * 1024 / 1e7;
  console.log(url.split("/")[2], "state", (Number(size) / 1e9).toFixed(3), "GB of target", (Number(target) / 1e9).toFixed(1), "GB; rent fee per 1KB", fee.toString(), "→ about", perKbDay.toFixed(5), "XLM per KB per day; 1 KB for 180 days ≈", (perKbDay * 180).toFixed(4), "XLM; for 120 days ≈", (perKbDay * 120).toFixed(4), "XLM");
}
