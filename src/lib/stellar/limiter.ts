/**
 * ONE QUEUE PER ENDPOINT, from Scrip's `limiter.ts`. Public Stellar RPC and Horizon refuse an
 * IP that asks too fast, and a paid endpoint bills by the request; a page that reads twenty
 * envelopes finds either limit without help. Every server read passes a gate: at most
 * `concurrency` in flight and one start every `1000 / rps` ms.
 *
 * It queues, it never drops: slow is a cost, a refused read would be a missing figure.
 */
export type Gate = {
  run: <T>(fn: () => Promise<T>) => Promise<T>;
  penalize: () => void;
  reward: () => void;
  coolingFor: () => number;
  readonly rps: number;
  readonly concurrency: number;
};

const COOL_FIRST_MS = 1_500;
const COOL_MAX_MS = 6_000;

const PUBLIC = /(^|\.)(soroban-testnet\.stellar\.org|horizon(-testnet)?\.stellar\.org|mainnet\.sorobanrpc\.com)$/i;

export function limitsFor(url: string): { rps: number; concurrency: number } {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    host = "";
  }
  const isPublic = PUBLIC.test(host);
  const isLocal = host === "127.0.0.1" || host === "localhost";
  const rps = Number(process.env.SOWN_RPC_RPS) || (isLocal ? 2_000 : isPublic ? 8 : 50);
  const concurrency = Number(process.env.SOWN_RPC_CONCURRENCY) || (isLocal ? 64 : isPublic ? 4 : 16);
  return { rps, concurrency };
}

/** One gate per endpoint per process, kept on `globalThis` so module copies share it. */
const KEY = Symbol.for("sown.rpc.gates");
type Store = { gates?: Map<string, Gate> };
function store(): Map<string, Gate> {
  const g = globalThis as unknown as Record<symbol, Store>;
  const slot = (g[KEY] ??= {});
  return (slot.gates ??= new Map());
}

export function gateFor(url: string): Gate {
  const gates = store();
  const hit = gates.get(url);
  if (hit) return hit;
  const made = makeGate(url);
  gates.set(url, made);
  return made;
}

export function makeGate(url: string): Gate {
  const { rps, concurrency } = limitsFor(url);
  const minGap = 1000 / rps;
  const waiting: Array<() => void> = [];
  let inFlight = 0;
  let lastStart = 0;
  let coolUntil = 0;
  let cool = 0;

  const pump = () => {
    if (inFlight >= concurrency || waiting.length === 0) return;
    const wait = Math.max(0, lastStart + minGap - Date.now(), coolUntil - Date.now());
    if (wait > 0) {
      setTimeout(pump, wait);
      return;
    }
    const next = waiting.shift();
    if (!next) return;
    lastStart = Date.now();
    inFlight += 1;
    next();
    if (waiting.length > 0) setTimeout(pump, minGap);
  };

  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    await new Promise<void>((resolve) => {
      waiting.push(resolve);
      pump();
    });
    try {
      return await fn();
    } finally {
      inFlight -= 1;
      pump();
    }
  };
  return {
    run,
    penalize: () => {
      cool = cool === 0 ? COOL_FIRST_MS : Math.min(cool * 2, COOL_MAX_MS);
      coolUntil = Date.now() + cool;
    },
    reward: () => {
      cool = 0;
      coolUntil = 0;
    },
    coolingFor: () => Math.max(0, coolUntil - Date.now()),
    rps,
    concurrency,
  };
}

/** Run one read through its endpoint's gate, cooling every caller when the endpoint refuses. */
export async function gated<T>(url: string, fn: () => Promise<T>): Promise<T> {
  const gate = gateFor(url);
  try {
    const out = await gate.run(fn);
    gate.reward();
    return out;
  } catch (err) {
    if (/429|rate|too many/i.test(err instanceof Error ? err.message : String(err))) gate.penalize();
    throw err;
  }
}
