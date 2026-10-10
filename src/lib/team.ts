/**
 * THE TEAM'S OWN WALLETS — declared, so every count of people can leave them out (Scrip's
 * `team.ts`). An envelope SENT from one of these is the team testing Sown; its receipt says
 * "Sown · team", and counts "outside the team" skip it. None is hidden.
 *
 * Testnet wallets are the build agent's (`.keys/`, public keys only here). The founder adds his
 * mainnet wallets before the first mainnet send.
 */
export const TEAM: ReadonlyMap<string, string> = new Map([
  ["GDHOCNJPIA763HJKYRNQ7WSWEM7JL4SD2FON2HXWFZY2NVLYJB6WSF67", "Sown's testnet admin"],
  ["GBBF5IISOQAC5CY77KT7SSMQ6CQFMQXROUDKTXAKSHEL4AETJ3OVGSA5", "Sown's servers, testnet"],
  ["GBL2HPXJUXNQ4GAJFLLKF5ISERWN6GQCDHFI3GMTSYZQMUWIVJ2SR6P5", "the testnet battery's sender"],
  ["GCNSJWWL3CMKYKGBOBDO5P7UBOJH6YMQ3ZQENZFVJDKTWMMZEZTJIZLA", "the testnet battery's recipient"],
  ["GD7CFMUBH75IIFCHAXTM3BGTVYD3DVBBRLYTBYCTCQ3CQICHCG33MM7P", "the build agent's test wallet in a browser, testnet"],
  // Mainnet (10 Oct 2026).
  ["GARLZZ3QVE5VWD2GWNTIJVYYTTQ33EYW6XXG3WXL75ZJL452EA4W3EFM", "the founder's Freighter"],
  ["GB7X3MGEX3EESITTTHEHTRJL65VQ7OQDVLZXVZCA5R4HUJCN2JGRALQY", "Sown's mainnet admin"],
  ["GDYRGI4JT3Z7VZOUBM5D67MSOX6GSLFJKETXRUI237H5EKMSUH45BJ33", "Sown's servers, mainnet"],
  ["GDUCOKR7RYTJDRO3HY27ZT5VF3KB63RS2V3C26KOZZ4OUZ2OSPPRMJGG", "the mainnet smoke's sender"],
]);

export function isTeam(address: string | null | undefined): boolean {
  return typeof address === "string" && TEAM.has(address);
}

/** An envelope is the team's when the team sent it: a test, whoever claimed it. */
export function envelopeIsTeam(e: { readonly sender: string }): boolean {
  return isTeam(e.sender);
}

export function outsideTeam<T extends { readonly sender: string }>(rows: readonly T[]): T[] {
  return rows.filter((r) => !envelopeIsTeam(r));
}
