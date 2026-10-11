import { OG } from "@/lib/og/palette";

/** The sprout on evergreen, for every icon size: the pale leaf, the stem, the kept leaf in the bright leaf. */
export function Sprout({ size, radius, pad }: { size: number; radius: number; pad: number }) {
  const glyph = size - pad * 2;
  return (
    <div style={{ display: "flex", width: size, height: size, background: OG.brand, alignItems: "center", justifyContent: "center", borderRadius: radius }}>
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
        <path d="M12 21.5V11.5" stroke={OG.bg} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M12 14.5C8.2 14.5 5 11.6 5 7.5C8.8 7.5 12 10.4 12 14.5Z" fill={OG.bg} />
        <path d="M12 11.5C12 7.1 15 3.5 19.5 3.5C19.5 7.9 16.4 11.5 12 11.5Z" fill={OG.leaf} />
      </svg>
    </div>
  );
}
