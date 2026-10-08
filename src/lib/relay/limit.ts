/**
 * TWO GUARDS IN FRONT OF THE SPONSOR'S KEY, held in this process (on `globalThis`, so a dev
 * server's module copies share them).
 *
 *  - per IP: a fixed window of requests, so one visitor cannot loop the relay.
 *  - per envelope: one request in flight at a time, so a double tap never pays twice. The
 *    chain is the lasting guard: a claimed envelope is no longer open, an existing wallet is
 *    not deployed again, and a wallet that already trusts an asset is not sponsored again.
 */
const KEY = Symbol.for("sown.relay.limits");
type Store = { hits: Map<string, { count: number; resetAt: number }>; busy: Set<string>; wallets: Map<string, { count: number; resetAt: number }> };

function store(): Store {
  const g = globalThis as unknown as Record<symbol, Store | undefined>;
  const s = (g[KEY] ??= { hits: new Map(), busy: new Set(), wallets: new Map() });
  s.wallets ??= new Map();
  return s;
}

export const WINDOW_MS = 10 * 60_000;
export const PER_WINDOW = Number(process.env.SOWN_RELAY_PER_IP ?? 30);

/** True when this IP may make another request now. */
export function allowIp(ip: string, now: number = Date.now()): boolean {
  const { hits } = store();
  const h = hits.get(ip);
  if (!h || h.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (h.count >= PER_WINDOW) return false;
  h.count += 1;
  return true;
}

export const MOVES_PER_DAY = Number(process.env.SOWN_RELAY_MOVES_PER_DAY ?? 5);

/** A passkey wallet's moves paid by Sown: a few a day. */
export function allowWallet(address: string, now: number = Date.now()): boolean {
  const { wallets } = store();
  const w = wallets.get(address);
  if (!w || w.resetAt <= now) {
    wallets.set(address, { count: 1, resetAt: now + 86_400_000 });
    return true;
  }
  if (w.count >= MOVES_PER_DAY) return false;
  w.count += 1;
  return true;
}

/** Take the envelope's lock; false when another request for it is in flight. */
export function lock(key: string): boolean {
  const { busy } = store();
  if (busy.has(key)) return false;
  busy.add(key);
  return true;
}

export function unlock(key: string): void {
  store().busy.delete(key);
}

/** For tests. */
export function resetLimits(): void {
  const s = store();
  s.hits.clear();
  s.busy.clear();
  s.wallets.clear();
}
