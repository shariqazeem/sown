import mainnetSmoke from "../../deployments/mainnet-smoke.json";
import battery from "../../deployments/testnet-battery.json";
import type { NetworkName } from "@/lib/stellar/network";

/**
 * WHAT WAS RUN, AND WHERE IT LANDED: on testnet, the battery (every path, scripted); on mainnet,
 * the smoke (the first dollar sent, claimed and moved back) and the film's envelope once it is
 * recorded (`npm run smoke:mainnet -- --record <id>`). `/proof` prints each step with its
 * transaction. A test holds every name here to the words a surface may use.
 */
export type EvidenceStep = { readonly name: string; readonly hash: string };

export type Film = {
  readonly id: string;
  readonly amount: string;
  readonly keepBps: number;
  readonly asset: string;
  readonly into: string;
  readonly sendTx: string | null;
  readonly claimTx: string | null;
  readonly secondsFromSendToClaim: number;
};

export type Evidence = { readonly label: string; readonly at: string | null; readonly steps: readonly EvidenceStep[]; readonly film: Film | null };

type RawStep = { readonly name: string; readonly tx?: unknown; readonly claimTx?: unknown; readonly refundTx?: unknown };

const HASH = /^[0-9a-f]{64}$/;

function stepsOf(raw: readonly RawStep[]): EvidenceStep[] {
  return raw.flatMap((s) => {
    const h = s.claimTx ?? s.tx ?? s.refundTx;
    return typeof h === "string" && HASH.test(h) ? [{ name: s.name, hash: h }] : [];
  });
}

export function evidenceFor(net: NetworkName): Evidence | null {
  if (net === "testnet") {
    const b = battery as unknown as { at: string; steps: RawStep[] };
    const steps = stepsOf(b.steps);
    return steps.length > 0 ? { label: "Every path, run on testnet by the battery", at: b.at, steps, film: null } : null;
  }
  const m = mainnetSmoke as unknown as { at: string | null; steps: RawStep[]; film?: Film };
  const steps = stepsOf(m.steps);
  if (steps.length === 0 && !m.film) return null;
  return { label: "The first dollars on mainnet", at: m.at, steps, film: m.film ?? null };
}

/** Every sentence the evidence can print, for the words test. */
export function evidenceWords(): string[] {
  const out: string[] = [];
  for (const net of ["testnet", "mainnet"] as const) {
    const e = evidenceFor(net);
    if (!e) continue;
    out.push(e.label, ...e.steps.map((s) => s.name));
    if (e.film) out.push(e.film.into, e.film.asset);
  }
  return out;
}
