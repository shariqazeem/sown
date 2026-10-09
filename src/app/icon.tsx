import { ImageResponse } from "next/og";
import { OG } from "@/lib/og/palette";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** The sprout mark as the favicon: evergreen ground, a pale leaf, the kept leaf in the bright leaf. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG.brand, alignItems: "center", justifyContent: "center", borderRadius: 16 }}>
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
          <path d="M12 21.5V11.5" stroke={OG.bg} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 14.5C8.2 14.5 5 11.6 5 7.5C8.8 7.5 12 10.4 12 14.5Z" fill={OG.bg} />
          <path d="M12 11.5C12 7.1 15 3.5 19.5 3.5C19.5 7.9 16.4 11.5 12 11.5Z" fill={OG.leaf} />
        </svg>
      </div>
    ),
    size,
  );
}
