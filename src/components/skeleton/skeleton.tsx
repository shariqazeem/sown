import "./skeleton.css";

/**
 * LOADING IS THE REAL LAYOUT WITH THE FIGURES NOT YET IN IT (from Scrip). Ruled bars the width
 * of what is coming, never a spinner, and never a bar that reads as a number.
 */
export function Bar({ w = "100%", tall = false }: { w?: string; tall?: boolean }) {
  return <span className={`sw-skel-bar${tall ? " is-tall" : ""}`} style={{ width: w }} aria-hidden />;
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="sw-skel-rows" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sw-skel-row">
          <Bar w={`${28 + ((i * 13) % 22)}%`} />
          <Bar w={`${34 + ((i * 17) % 26)}%`} />
          <Bar w="12%" />
        </div>
      ))}
    </div>
  );
}

/** The envelope's shape while it is read: head, a line, the units bar, ruled rows. */
export function SkeletonEnvelope({ label }: { label: string }) {
  return (
    <div className="sw-skel-env" role="status" aria-live="polite">
      <p className="sw-skel-note">{label}</p>
      <div className="sw-skel-sheet" aria-hidden>
        <Bar w="40%" />
        <Bar w="55%" />
        <Bar w="70%" tall />
        <Bar w="45%" />
        <hr />
        <Bar w="90%" />
        <Bar w="80%" />
        <Bar w="85%" />
      </div>
    </div>
  );
}
