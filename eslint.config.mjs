import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  eslintConfigPrettier,
  {
    ignores: ["node_modules/**", ".next/**", ".next-build/**", "out/**", "build/**", "coverage/**", "next-env.d.ts", "target/**", "contracts/**", "artifacts/**"],
  },
];

export default eslintConfig;
