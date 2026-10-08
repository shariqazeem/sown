import { SownMark } from "./mark";

/**
 * THE WORDMARK — Sown, in Fraunces at a heavy optical size. Fraunces appears here and nowhere
 * else (DESIGN.md). The mark beside it is the sprout.
 */
export function Wordmark({ size = 22, withMark = true }: { size?: number; withMark?: boolean }) {
  return (
    <span className="sw-wordmark-wrap" style={{ gap: Math.round(size * 0.35) }}>
      {withMark ? <SownMark size={size} /> : null}
      <span className="sw-wordmark" style={{ fontSize: size * 1.05 }}>
        Sown
      </span>
    </span>
  );
}
