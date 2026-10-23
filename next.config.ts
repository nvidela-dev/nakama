import type { NextConfig } from "next";
const config: NextConfig = {
  // Operational log files are runtime data and must never enter deployment bundles.
  outputFileTracingExcludes: { "/*": ["./.nakama/**/*"] },
  env: {
    NAKAMA_RELEASE: process.env.NAKAMA_RELEASE ?? "local",
    NAKAMA_BUILD_ID: process.env.NAKAMA_BUILD_ID ?? "",
  },
  generateBuildId: async () => process.env.NAKAMA_BUILD_ID ?? "local",
  experimental: { serverSourceMaps: true, serverActions: { bodySizeLimit: "3mb" } },
  // Server Action arguments can contain answers and invitation tokens.
  logging: { serverFunctions: false },
};
export default config;
