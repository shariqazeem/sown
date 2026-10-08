import type { NetworkName } from "@/lib/stellar/network";

/**
 * WHAT CAN BE KEPT, AND THE DOLLAR IT IS KEPT FROM.
 *
 * A keep asset is a record: the token contract, the Aquarius pool that converts USDC into it,
 * and the indices inside that pool. The contract holds the same table (`asset(addr)`); a test
 * reads both and fails if they drift. The issuer's words are quoted from the issuer's own
 * pages and attributed; what the issuer can do is never written here, it is read from the
 * issuer's account on the chain at request time (`issuer-flags.ts`).
 *
 * Read on 2026-10-08: pools and indices from the pools' own `get_tokens()` (mainnet by
 * simulation), descriptions from each issuer's stellar.toml and Ondo's launch post.
 */
export type KeepKey = "usdy" | "ustry" | "cetes" | "xlm";

export type KeepAssetEntry = {
  readonly key: KeepKey;
  readonly network: NetworkName;
  /** The name people use, first on any screen: "US Treasuries". */
  readonly name: string;
  /** The first mention on a screen: "US Treasuries (Ondo USDY)". */
  readonly fullName: string;
  readonly ticker: string;
  readonly issuerName: string;
  /** The classic asset: code and issuer account (null for XLM). */
  readonly code: string;
  readonly issuer: string | null;
  /** Its Stellar Asset Contract: what the Sown contract and the pool hold. */
  readonly sac: string;
  readonly pool: string;
  readonly poolFeeBps: number;
  readonly inIdx: number;
  readonly outIdx: number;
  readonly decimals: 7;
  /** The issuer's own words, quoted exactly, and where they were read. */
  readonly quote: string;
  readonly quoteSource: string;
  readonly quoteSourceLabel: string;
  /** Where the issuer describes the asset in full. */
  readonly issuerPage: string;
  readonly homeDomain: string | null;
  /** Testnet has no tokenized Treasuries: XLM stands in, and says so. */
  readonly standIn: boolean;
  /** Offered to non-US persons only, by the issuer's terms. */
  readonly notForUs: boolean;
};

export type CashAsset = { readonly code: "USDC"; readonly issuer: string; readonly sac: string; readonly issuerName: string };

export const USDC: Record<NetworkName, CashAsset> = {
  mainnet: {
    code: "USDC",
    issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    sac: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
    issuerName: "Circle",
  },
  // Aquarius's testnet pools trade their own test USDC, not Circle's testnet USDC
  // (GBBD47IF…), which has no Aquarius pool against XLM. See Known drift.
  testnet: {
    code: "USDC",
    issuer: "GAHPYWLK6YRN7CVYZOO4H3VDRZ7PVF5UJGLZCSPAEIKJE2XSWF5LAGER",
    sac: "CAZRY5GSFBFXD7H6GAFBA5YGYQTDXU4QKWKMYFWBAZFUCURN3WKX6LF5",
    issuerName: "Aquarius's test issuer",
  },
};

const MAINNET: readonly KeepAssetEntry[] = [
  {
    key: "usdy",
    network: "mainnet",
    name: "US Treasuries",
    fullName: "US Treasuries (Ondo USDY)",
    ticker: "USDY",
    issuerName: "Ondo",
    code: "USDY",
    issuer: "GAJMPX5NBOG6TQFPQGRABJEEB2YE7RFRLUKJDZAZGAD5GFX4J7TADAZ6",
    sac: "CB3YA656OYIHU57657I5KGSBRHE5I3OZU4VFC22PYAOANFZHEWNYGAGP",
    pool: "CAFHLHGZXOVNCGFJ7DOXL7JDNMBCEZKDI3LS5NRQH3GXC7CSIMQZHUSM",
    poolFeeBps: 10,
    inIdx: 1,
    outIdx: 0,
    decimals: 7,
    quote: "backed by short-term U.S. Treasuries and bank demand deposits",
    quoteSource: "https://ondo.finance/blog/usdy-is-now-live-on-stellar",
    quoteSourceLabel: "Ondo, announcing USDY on Stellar",
    issuerPage: "https://ondo.finance/.well-known/stellar.toml",
    homeDomain: "ondo.finance",
    standIn: false,
    notForUs: true,
  },
  {
    key: "ustry",
    network: "mainnet",
    name: "US Treasury notes",
    fullName: "US Treasury notes (Etherfuse USTRY)",
    ticker: "USTRY",
    issuerName: "Etherfuse",
    code: "USTRY",
    issuer: "GCRYUGD5NVARGXT56XEZI5CIFCQETYHAPQQTHO2O3IQZTHDH4LATMYWC",
    sac: "CBLV4ATSIWU67CFSQU2NVRKINQIKUZ2ODSZBUJTJ43VJVRSBTZYOPNUR",
    pool: "CCX2TYR4AQTPPMTZOIMP3YIBHAYLLSTXVP47PAGTL753PCQFSKV32MIA",
    poolFeeBps: 30,
    inIdx: 1,
    outIdx: 0,
    decimals: 7,
    quote: "Our US Treasury Notes Stablebond",
    quoteSource: "https://etherfuse.com/.well-known/stellar.toml",
    quoteSourceLabel: "Etherfuse's stellar.toml, anchored to “US Treasury Notes”",
    issuerPage: "https://etherfuse.com/.well-known/stellar.toml",
    homeDomain: "etherfuse.com",
    standIn: false,
    notForUs: true,
  },
  {
    key: "cetes",
    network: "mainnet",
    name: "Mexican CETES",
    fullName: "Mexican CETES (Etherfuse)",
    ticker: "CETES",
    issuerName: "Etherfuse",
    code: "CETES",
    issuer: "GCRYUGD5NVARGXT56XEZI5CIFCQETYHAPQQTHO2O3IQZTHDH4LATMYWC",
    sac: "CAL6ER2TI6CTRAY6BFXWNWA7WTYXUXTQCHUBCIBU5O6KM3HJFG6Z6VXV",
    pool: "CCKGQSQG5JLZBMYMB4HT6M4H7FUC3NK5C75MIHN6627LRAY5B2SYL2AD",
    poolFeeBps: 10,
    inIdx: 1,
    outIdx: 0,
    decimals: 7,
    quote: "Mexico's oldest short-term debt securities issued by the Ministry of Finance",
    quoteSource: "https://etherfuse.com/.well-known/stellar.toml",
    quoteSourceLabel: "Etherfuse's stellar.toml",
    issuerPage: "https://etherfuse.com/.well-known/stellar.toml",
    homeDomain: "etherfuse.com",
    standIn: false,
    notForUs: true,
  },
];

const TESTNET: readonly KeepAssetEntry[] = [
  {
    key: "xlm",
    network: "testnet",
    name: "XLM, a testnet stand-in",
    fullName: "XLM (testnet stand-in for US Treasuries)",
    ticker: "XLM",
    issuerName: "the Stellar network",
    code: "XLM",
    issuer: null,
    sac: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    pool: "CD3LFMMLBQ6RBJUD3Z2LFDFE6544WDRMWHEZYPI5YDVESYRSO2TT32BX",
    poolFeeBps: 30,
    inIdx: 0,
    outIdx: 1,
    decimals: 7,
    quote: "No US Treasuries are issued on testnet, so a testnet send keeps XLM through the Aquarius testnet pool.",
    quoteSource: "https://docs.aqua.network/developers/testing-on-testnet",
    quoteSourceLabel: "Sown, on why testnet keeps XLM",
    issuerPage: "https://developers.stellar.org/docs/learn/fundamentals/lumens",
    homeDomain: null,
    standIn: true,
    notForUs: false,
  },
];

export const CATALOGUE: Record<NetworkName, readonly KeepAssetEntry[]> = { mainnet: MAINNET, testnet: TESTNET };

export function keepAssets(network: NetworkName): readonly KeepAssetEntry[] {
  return CATALOGUE[network];
}

export function keepAssetByKey(network: NetworkName, key: string): KeepAssetEntry | null {
  return CATALOGUE[network].find((a) => a.key === key) ?? null;
}

export function keepAssetBySac(network: NetworkName, sac: string): KeepAssetEntry | null {
  return CATALOGUE[network].find((a) => a.sac === sac) ?? null;
}

/** The first keep asset on a network is the default one a send card opens on. */
export function defaultKeep(network: NetworkName): KeepAssetEntry {
  return CATALOGUE[network][0]!;
}

/** The asset's line under the units: "US Treasuries, Ondo", or what a stand-in stands in for. */
export function assetLine(a: { readonly name: string; readonly issuerName: string; readonly standIn: boolean; readonly ticker?: string }): string {
  return a.standIn ? "XLM, standing in for US Treasuries on testnet" : `${a.name}, ${a.issuerName}`;
}
