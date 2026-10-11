import { ImageResponse } from "next/og";
import { Sprout } from "@/lib/og/sprout";

export const runtime = "nodejs";
export const dynamic = "force-static";

/** The home-screen icon at 192 px. */
export function GET() {
  return new ImageResponse(<Sprout size={192} radius={Math.round(192 * 0.22)} pad={Math.round(192 * 0.16)} />, { width: 192, height: 192 });
}
