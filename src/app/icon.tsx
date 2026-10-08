import { ImageResponse } from "next/og";
import { OG } from "@/lib/og/palette";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** The sprout mark as the favicon: a stem, a leaf in ink, the kept leaf in the accent. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG.bg, alignItems: "center", justifyContent: "center", borderRadius: 14 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M12 21.5V11.5" stroke={OG.ink} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 14.5C8.2 14.5 5 11.6 5 7.5C8.8 7.5 12 10.4 12 14.5Z" fill={OG.ink} />
          <path d="M12 11.5C12 7.1 15 3.5 19.5 3.5C19.5 7.9 16.4 11.5 12 11.5Z" fill={OG.accent} />
        </svg>
      </div>
    ),
    size,
  );
}
