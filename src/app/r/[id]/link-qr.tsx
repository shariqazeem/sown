"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** This page's own link as a code, so a phone in the hand can open it where Face ID lives. */
export function LinkQr() {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#000000";
    QRCode.toString(window.location.href, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: ink, light: "#00000000" } })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, []);
  if (!svg) return null;
  return <div className="sw-claim-qr" aria-label="This link as a QR code" dangerouslySetInnerHTML={{ __html: svg }} />;
}
