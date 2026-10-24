import { defineConfig } from "@playwright/test";
const port = process.env.FRONTEND_PORT ?? "3035";
const url = `http://localhost:${port}`;
export default defineConfig({
  outputDir: ".nakama/test-results/frontend",
  testDir: "./tests/browser",
  testMatch: ["frontend.spec.ts", "themes.spec.ts"],
  workers: 1,
  use: {
    baseURL: url,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: `npm start -- --port ${port}`,
    url: url,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
