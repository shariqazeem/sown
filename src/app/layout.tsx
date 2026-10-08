import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { Toasts } from "@/components/toast/toasts";
import { siteUrl } from "@/lib/site";
import "./globals.css";
import "../styles/tokens.css";

const instrument = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-instrument", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], weight: "variable", axes: ["opsz", "SOFT"], variable: "--font-fraunces", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

/** Written to be quoted: an answer engine lifting one sentence should lift what Sown does. */
const TITLE = "Sown — send money home, part of it stays theirs";
const DESCRIPTION =
  "Sown sends USDC on Stellar and keeps a slice of it, 10% by default, as US Treasuries (Ondo USDY) or Mexican CETES, bought on Aquarius in the same transaction. The recipient claims it with Face ID into a wallet of their own, with no app and no fees, and every send prints a receipt read from the ledger.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: TITLE, template: "%s · Sown" },
  description: DESCRIPTION,
  applicationName: "Sown",
  openGraph: { type: "website", siteName: "Sown" },
  twitter: { card: "summary_large_image" },
  // A claim link must never be indexed: the path is public, but nothing else should be.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${instrument.variable} ${plexMono.variable} ${fraunces.variable}`}>
      <body>
        {children}
        <Toasts />
      </body>
    </html>
  );
}
