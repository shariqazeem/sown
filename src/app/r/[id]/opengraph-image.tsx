import { ImageResponse } from "next/og";
import { OG } from "@/lib/og/palette";

export const runtime = "nodejs";
export const alt = "An envelope is waiting for you on Sown";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const col = { display: "flex" as const, flexDirection: "column" as const };

/**
 * A CLAIM LINK'S PREVIEW, with no figures: the link is somebody's money, and a chat preview is
 * seen by whoever scrolls past it. It says what the link is and what tapping it does.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ ...col, width: "100%", height: "100%", background: OG.bg, alignItems: "center", justifyContent: "center", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ ...col, width: 820, background: OG.bg, border: `3px dashed ${OG.inkFaint}`, borderRadius: 18, padding: 56, alignItems: "flex-start" }}>
          <div style={{ display: "flex", fontSize: 26, color: OG.warn, fontWeight: 600 }}>Sent, waiting for you</div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: OG.ink, marginTop: 22, letterSpacing: -2, lineHeight: 1.05 }}>Money sent home, and part of it kept for you.</div>
          <div style={{ display: "flex", fontSize: 30, color: OG.inkMuted, marginTop: 26 }}>Tap to claim it with your face. No app, nothing to pay.</div>
          <div style={{ display: "flex", fontSize: 30, color: OG.ink, fontWeight: 700, marginTop: 36 }}>Sown</div>
        </div>
      </div>
    ),
    size,
  );
}
