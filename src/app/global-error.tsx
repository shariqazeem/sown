"use client";

/**
 * The last boundary: the root layout itself failed, so there are no fonts and no tokens to lean
 * on. Plain, honest, one way back. The colours are the paper, ink and accent tokens' values,
 * written out because the token sheet may be the thing that failed.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#f7f5ef", color: "#14161c", fontFamily: "system-ui, sans-serif", margin: 0, padding: "48px 24px" }}>
        <main style={{ maxWidth: 560, margin: "0 auto" }}>
          <h1 style={{ fontSize: 28, letterSpacing: -0.6, margin: "0 0 12px" }}>Sown could not show this page.</h1>
          <p style={{ color: "#5a5d66", lineHeight: 1.6, margin: "0 0 24px" }}>
            Nothing was sent and nothing was charged. Every envelope and every claim is on the Stellar ledger, untouched by whatever happened here.
          </p>
          <button type="button" onClick={reset} style={{ font: "inherit", padding: "12px 18px", borderRadius: 10, border: 0, background: "#2b4acb", color: "#fff", cursor: "pointer" }}>
            Try again
          </button>
          {error.digest ? <p style={{ marginTop: 24, color: "#8b8e97", fontFamily: "ui-monospace, monospace", fontSize: 13 }}>{error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
