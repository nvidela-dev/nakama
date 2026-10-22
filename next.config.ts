import type { NextConfig } from "next";
const config: NextConfig = {
  // Server Action arguments can contain answers and invitation tokens.
  logging: { serverFunctions: false },
};
export default config;
