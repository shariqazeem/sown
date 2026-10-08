/**
 * FAILURE RETURNS A VALUE AND NEVER THROWS FOR CONTROL FLOW. Carried from Scrip.
 *
 * A pool that does not answer, an envelope that is not open, a secret that does not match:
 * each one HOLDS and says why, in a sentence a person can read on the surface. A thrown
 * exception in money code is caught somewhere generic and becomes a shrug; a held value
 * carries its reason all the way to the screen.
 */
export type Outcome<T> = { ok: true; value: T } | { ok: false; why: string };

export const ok = <T>(value: T): Outcome<T> => ({ ok: true, value });

/** Hold, and say why. The name is the instruction. */
export const held = <T = never>(why: string): Outcome<T> => ({ ok: false, why });

export function isOk<T>(o: Outcome<T>): o is { ok: true; value: T } {
  return o.ok;
}

/** Chain an outcome; a hold passes through with its reason intact. */
export function map<A, B>(o: Outcome<A>, f: (a: A) => B): Outcome<B> {
  return o.ok ? ok(f(o.value)) : o;
}

export function flatMap<A, B>(o: Outcome<A>, f: (a: A) => Outcome<B>): Outcome<B> {
  return o.ok ? f(o.value) : o;
}

/** Collect outcomes, holding on the first failure with its reason. */
export function all<T>(items: readonly Outcome<T>[]): Outcome<T[]> {
  const out: T[] = [];
  for (const it of items) {
    if (!it.ok) return it;
    out.push(it.value);
  }
  return ok(out);
}

/**
 * THE LAST GUARD. A throw from below (an RPC that refuses, a decoder that meets a byte it did
 * not expect) becomes a hold with the reason on it. `what` names the thing in a reader's words:
 * "this envelope", "the pool".
 */
export async function attempt<T>(what: string, fn: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
  try {
    return await fn();
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    return held(
      /429|rate limit|too many/i.test(why)
        ? `The Stellar network's endpoint is refusing reads right now, so ${what} could not be read. Nothing is lost; try again in a moment.`
        : `Could not read ${what} (${why.slice(0, 160)}).`,
    );
  }
}
