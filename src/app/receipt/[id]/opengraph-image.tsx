import { ImageResponse } from "next/og";
import { assetLine } from "@/lib/assets/catalogue";
import { readReceipt } from "@/lib/envelope/receipt";
import { headline, sentTotal } from "@/lib/envelope/view";
import { bps, fromRaw, stampUTC, units, usdAligned } from "@/lib/format";
import { OG } from "@/lib/og/palette";

export const runtime = "nodejs";
export const alt = "A Sown receipt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const row = { display: "flex" as const, flexDirection: "row" as const };
const col = { display: "flex" as const, flexDirection: "column" as const };

/**
 * THE SHARE CARD — the envelope, at its fourth size, read from the contract like the page. When
 * the number names no envelope, the card says so instead of inventing one. Satori needs every
 * container with more than one child to declare flex; every div below does.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await readReceipt(id);
  if (!r.ok) {
    return new ImageResponse(
      <div style={{ ...row, width: "100%", height: "100%", background: OG.bg, alignItems: "center", justifyContent: "center", fontFamily: "monospace", color: OG.inkMuted, fontSize: 36 }}>No envelope with that number</div>,
      size,
    );
  }
  const e = r.value.envelope;
  const a = r.value.asset;
  const h = headline(e);
  const tone = h.tone === "ok" ? OG.ok : h.tone === "waiting" ? OG.warn : OG.inkMuted;
  return new ImageResponse(
    (
      <div style={{ ...row, width: "100%", height: "100%", background: OG.bg, alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ ...col, width: 760, background: OG.surface, border: `2px ${h.tone === "waiting" ? "dashed" : "solid"} ${OG.border}`, borderRadius: 16, padding: 44, color: OG.ink, fontFamily: "sans-serif" }}>
          <div style={{ ...row, justifyContent: "space-between", alignItems: "center", fontSize: 22, color: OG.inkFaint, marginBottom: 26 }}>
            <div style={{ ...row, alignItems: "center", gap: 10, color: tone, fontWeight: 600 }}>
              <div style={{ display: "flex", width: 11, height: 11, borderRadius: 11, background: tone }} />
              <div style={{ display: "flex" }}>{h.kicker}</div>
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: OG.ink }}>Sown</div>
          </div>
          <div style={{ display: "flex", fontSize: 32, color: OG.inkMuted }}>{`${usdAligned(fromRaw(sentTotal(e)))} sent`}</div>
          <div style={{ display: "flex", fontSize: 24, color: OG.inkFaint, marginTop: 18 }}>{e.keepIn > 0n ? `${bps(e.keepBps)} kept as` : "nothing kept"}</div>
          <div style={{ ...row, alignItems: "baseline", fontSize: 104, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
            <div style={{ display: "flex" }}>{units(e.keepOut)}</div>
            <div style={{ display: "flex", fontSize: 38, color: OG.inkMuted, marginLeft: 16, fontWeight: 500, letterSpacing: 0 }}>{a?.ticker ?? "units"}</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: OG.inkMuted, marginTop: 16 }}>{a ? assetLine(a) : ""}</div>
          <div style={{ ...row, borderTop: `2px solid ${OG.border}`, marginTop: 28, paddingTop: 18, justifyContent: "space-between", fontSize: 22, color: OG.inkMuted }}>
            <div style={{ display: "flex" }}>{`${usdAligned(fromRaw(e.cash))} to spend`}</div>
            <div style={{ display: "flex" }}>{stampUTC(e.createdAt)}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
