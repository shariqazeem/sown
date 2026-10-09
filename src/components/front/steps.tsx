import "./steps.css";

/** HOW SOWN WORKS: three cards, each with a small drawing in ink and gold. */
export function Steps() {
  return (
    <ol className="sw-steps">
      <li className="sw-step">
        <span className="art" aria-hidden>
          <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
            <rect x="8" y="14" width="48" height="36" rx="8" stroke="currentColor" strokeWidth="2.5" />
            <path d="M8 26h48" stroke="currentColor" strokeWidth="2.5" />
            <rect x="16" y="34" width="20" height="6" rx="3" fill="var(--leaf-deep)" />
            <rect x="38" y="34" width="10" height="6" rx="3" fill="var(--gold)" />
          </svg>
        </span>
        <p className="n">1</p>
        <p className="t">You send dollars, as you do.</p>
        <p className="d">USDC from the Stellar wallet you already use, with one approval. Choose how much they keep: 10% unless you say otherwise.</p>
      </li>
      <li className="sw-step">
        <span className="art" aria-hidden>
          <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
            <path d="M22 8h20a4 4 0 0 1 4 4v40a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="32" cy="30" r="8" stroke="var(--gold)" strokeWidth="2.5" />
            <path d="M26 42c2-3 10-3 12 0" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="12.5" r="1.6" fill="currentColor" />
          </svg>
        </span>
        <p className="n">2</p>
        <p className="t">The keep becomes US Treasuries in the same transaction.</p>
        <p className="d">Sown buys it on Aquarius, Stellar&apos;s exchange, at the price you saw, or nothing happens. Both parts wait in an envelope that only the link can open.</p>
      </li>
      <li className="sw-step">
        <span className="art" aria-hidden>
          <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
            <path d="M14 10h36v44l-6-4-6 4-6-4-6 4-6-4-6 4V10Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M22 22h20M22 30h20M22 38h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M40 40c0-4 3-7 7-7 0 4-3 7-7 7Z" fill="var(--leaf-deep)" />
          </svg>
        </span>
        <p className="n">3</p>
        <p className="t">They claim it with their face.</p>
        <p className="d">You share a link. They tap it, Face ID makes them a wallet only they control, and Sown&apos;s servers pay the network. Dollars to spend, Treasuries that stay, and a receipt for both.</p>
      </li>
    </ol>
  );
}
