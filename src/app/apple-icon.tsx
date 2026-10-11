import { ImageResponse } from "next/og";
import { Sprout } from "@/lib/og/sprout";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The icon iOS puts on the home screen; iOS rounds the corners itself. */
export default function AppleIcon() {
  return new ImageResponse(<Sprout size={180} radius={0} pad={30} />, size);
}
