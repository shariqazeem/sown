/**
 * THE SOWN MARK — a sprout: a stem, a leaf in the text colour, and one leaf in the accent. The
 * accent leaf is the part that stays. It takes the colour of wherever it sits; the kept leaf
 * takes `--leaf`, document blue on paper and the lifted blue on ink.
 */
export function SownMark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" focusable="false" style={{ flex: "none", display: "block" }}>
      <path d="M12 21.5V11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 14.5C8.2 14.5 5 11.6 5 7.5C8.8 7.5 12 10.4 12 14.5Z" fill="currentColor" />
      <path d="M12 11.5C12 7.1 15 3.5 19.5 3.5C19.5 7.9 16.4 11.5 12 11.5Z" fill="var(--leaf-mark, var(--leaf))" />
    </svg>
  );
}
