import { ImageResponse } from "next/og";
import { Sprout } from "@/lib/og/sprout";

export const runtime = "nodejs";
export const dynamic = "force-static";

/** The maskable icon: evergreen to every edge, the glyph inside the safe zone. */
export function GET() {
  return new ImageResponse(<Sprout size={512} radius={0} pad={116} />, { width: 512, height: 512 });
}
