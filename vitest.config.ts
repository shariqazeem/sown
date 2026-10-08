import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// `server-only` / `client-only` are Next build-time markers with no runtime package.
const emptyModule = fileURLToPath(new URL("./vitest.empty.ts", import.meta.url));

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: { alias: { "server-only": emptyModule, "client-only": emptyModule } },
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", ".next-build/**", "target/**", "contracts/**"],
    css: false,
    pool: "forks",
    isolate: true,
    testTimeout: 20_000,
    // The offline suite never touches a network; a test that needs one says so and is skipped.
    env: { SOWN_DB: "", NEXT_PUBLIC_SOWN_NETWORK: "testnet" },
  },
});
