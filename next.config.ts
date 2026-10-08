import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Build beside a running dev server, never over it (Scrip's lesson): `npm run build` writes
  // to .next-build and leaves the serving directory alone.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: { root: __dirname },
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        // The claim link's secret lives in the fragment, which browsers never send. Referrer
        // policy keeps even the path from leaking to the pages a recipient opens next.
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
