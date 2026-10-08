import { ImageResponse } from "next/og";
import { OG } from "@/lib/og/palette";

export const runtime = "nodejs";
export const alt = "Sown: send money home, part of it stays theirs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const col = { display: "flex" as const, flexDirection: "column" as const };

/** The site's own card: the line, and what it means, in words. No sample figures. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ ...col, width: "100%", height: "100%", background: OG.bg, justifyContent: "center", padding: 88, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: OG.ink }}>Sown</div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, color: OG.ink, marginTop: 28, letterSpacing: -3, lineHeight: 1.02, maxWidth: 960 }}>Send money home. Part of it stays theirs.</div>
        <div style={{ display: "flex", fontSize: 32, color: OG.inkMuted, marginTop: 30, maxWidth: 980, lineHeight: 1.35 }}>
          A slice of every send becomes US Treasuries in the recipient&apos;s own wallet, claimed with Face ID. On Stellar, with a receipt.
        </div>
      </div>
    ),
    size,
  );
}
