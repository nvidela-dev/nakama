import type { NextConfig } from "next";
const config: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  // Server Action arguments can contain answers and invitation tokens.
  logging: { serverFunctions: false },
};
export default config;
