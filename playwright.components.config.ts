import { defineConfig } from "@playwright/test";
export default defineConfig({
  outputDir: ".nakama/test-results/components",
  testDir: "./tests/browser",
  testMatch: "components.spec.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:6006",
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: "npm run storybook -- --host 127.0.0.1 --ci",
    url: "http://127.0.0.1:6006",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
