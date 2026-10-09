import { ImageResponse } from "next/og";
import { OG } from "@/lib/og/palette";

export const runtime = "nodejs";
export const alt = "An envelope is waiting for you on Sown";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const col = { display: "flex" as const, flexDirection: "column" as const };
const row = { display: "flex" as const, flexDirection: "row" as const };

/**
 * A CLAIM LINK'S PREVIEW, with no figures: the link is somebody's money, and a chat preview is
 * seen by whoever scrolls past it. It says what the link is and what tapping it does.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ ...col, width: "100%", height: "100%", background: OG.bg, alignItems: "center", justifyContent: "center", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ ...col, width: 860, background: OG.surface, border: `2px solid ${OG.border}`, borderRadius: 36, overflow: "hidden" }}>
          <div style={{ ...row, alignItems: "center", justifyContent: "space-between", padding: "22px 40px", background: OG.surfaceInverse, color: OG.bg, fontSize: 24 }}>
            <div style={{ ...row, alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", width: 14, height: 14, borderRadius: 14, background: OG.gold }} />
              <div style={{ display: "flex", fontWeight: 700 }}>Sent on Stellar, waiting for you</div>
            </div>
            <div style={{ display: "flex", fontFamily: "serif", fontSize: 30 }}>Sown</div>
          </div>
          <div style={{ ...col, padding: 48, gap: 22 }}>
            <div style={{ display: "flex", fontSize: 60, fontFamily: "serif", color: OG.ink, lineHeight: 1.05, letterSpacing: -1 }}>Money sent home, and part of it kept for you.</div>
            <div style={{ display: "flex", fontSize: 28, color: OG.inkMuted, lineHeight: 1.4 }}>Tap to claim it with your face. No app, nothing to pay. Dollars to spend, and a part that stays yours.</div>
            <div style={{ ...row, gap: 6, height: 16, marginTop: 10 }}>
              <div style={{ display: "flex", flexGrow: 9, background: OG.ok, borderRadius: 999 }} />
              <div style={{ display: "flex", flexGrow: 1, background: OG.gold, borderRadius: 999 }} />
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
