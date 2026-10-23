import type { StorybookConfig } from "@storybook/nextjs-vite";
const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../src/shared/ui/**/*.stories.@(ts|tsx)", "../src/features/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  core: { disableTelemetry: true },
};
export default config;
