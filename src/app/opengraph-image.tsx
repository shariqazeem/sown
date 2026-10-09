import { ImageResponse } from "next/og";
import { OG } from "@/lib/og/palette";

export const runtime = "nodejs";
export const alt = "Sown: send money home, part of it stays theirs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const col = { display: "flex" as const, flexDirection: "column" as const };
const row = { display: "flex" as const, flexDirection: "row" as const };

/** The site's own card: evergreen, the line, the split in green and gold. No sample figures. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ ...col, width: "100%", height: "100%", background: OG.surfaceInverse, justifyContent: "space-between", padding: 72, fontFamily: "serif", color: OG.bg }}>
        <div style={{ ...row, alignItems: "center", gap: 14, fontSize: 40 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M12 21.5V11.5" stroke={OG.bg} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M12 14.5C8.2 14.5 5 11.6 5 7.5C8.8 7.5 12 10.4 12 14.5Z" fill={OG.bg} />
            <path d="M12 11.5C12 7.1 15 3.5 19.5 3.5C19.5 7.9 16.4 11.5 12 11.5Z" fill={OG.leaf} />
          </svg>
          <div style={{ display: "flex" }}>Sown</div>
        </div>
        <div style={{ ...col, gap: 26 }}>
          <div style={{ display: "flex", fontSize: 92, lineHeight: 1.02, letterSpacing: -2, maxWidth: 1000 }}>
            Send money home. <span style={{ color: OG.gold, fontStyle: "italic", marginLeft: 18 }}>Part of it stays theirs.</span>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#afc4b8", fontFamily: "sans-serif", maxWidth: 980, lineHeight: 1.35 }}>
            A slice of every send becomes US Treasuries in the recipient&apos;s own wallet, claimed with Face ID. On Stellar, with a receipt.
          </div>
        </div>
        <div style={{ ...row, gap: 6, height: 18 }}>
          <div style={{ display: "flex", flexGrow: 9, background: OG.leaf, borderRadius: 999 }} />
          <div style={{ display: "flex", flexGrow: 1, background: OG.gold, borderRadius: 999 }} />
        </div>
      </div>
    ),
    size,
  );
}
