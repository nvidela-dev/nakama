import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    ".nakama/**",
    "storybook-static/**",
    "node_modules/**",
    "src/**/*.generated.ts",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  // Private artifact URLs require the browser's authenticated session. The image
  // optimizer cannot forward that session; keep these requests direct and private.
  {
    files: ["src/features/artifacts/components/*.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
]);
