import type { Metadata, Viewport } from "next";
import { DM_Mono, Instrument_Serif, Manrope } from "next/font/google";
import { Toasts } from "@/components/toast/toasts";
import { siteUrl } from "@/lib/site";
import "./globals.css";
import "../styles/tokens.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });

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
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0f3f2f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        {children}
        <Toasts />
      </body>
    </html>
  );
}
