import { defineConfig } from "@playwright/test";
export default defineConfig({
  outputDir: ".nakama/test-results/frontend",
  testDir: "./tests/browser",
  testMatch: "frontend.spec.ts",
  workers: 1,
  use: {
    baseURL: "http://localhost:3035",
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: "npm start -- --port 3035",
    url: "http://localhost:3035",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
