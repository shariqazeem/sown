import { ImageResponse } from "next/og";
import { Sprout } from "@/lib/og/sprout";

export const runtime = "nodejs";
export const dynamic = "force-static";

/** The home-screen icon at 512 px. */
export function GET() {
  return new ImageResponse(<Sprout size={512} radius={Math.round(512 * 0.22)} pad={Math.round(512 * 0.16)} />, { width: 512, height: 512 });
}
