import { defineConfig } from "@playwright/test";
const port = process.env.STORYBOOK_PORT ?? "6006";
const url = `http://127.0.0.1:${port}`;
export default defineConfig({
  outputDir: ".nakama/test-results/components",
  testDir: "./tests/browser",
  testMatch: "components.spec.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: url,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: `npm run storybook -- --port ${port} --host 127.0.0.1 --ci`,
    url: url,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
