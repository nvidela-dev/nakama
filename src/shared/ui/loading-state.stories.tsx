import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoadingState } from "./loading-state";
const meta = {
  title: "UI/Loading",
  component: LoadingState,
  args: { label: "Loading project…", lines: 3 },
} satisfies Meta<typeof LoadingState>;
export default meta;
export const Skeleton: StoryObj<typeof meta> = {};
