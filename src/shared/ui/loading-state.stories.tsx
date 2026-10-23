import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoadingState } from "./loading-state";
const meta = {
  title: "UI/Loading",
  component: LoadingState,
  args: { label: "Loading project…", lines: 3, variant: "stack" },
} satisfies Meta<typeof LoadingState>;
export default meta;
export const Skeleton: StoryObj<typeof meta> = {};
export const Cards: StoryObj<typeof meta> = {
  args: { label: "Loading projects…", lines: 4, variant: "cards" },
};
export const Workspace: StoryObj<typeof meta> = {
  args: { label: "Loading workspace…", lines: 3, variant: "workspace" },
};
export const Compact: StoryObj<typeof meta> = {
  args: { label: "Loading items…", lines: 3, variant: "compact" },
};
export const MapSkeleton: StoryObj<typeof meta> = {
  args: { label: "Loading 3D stage map…", lines: 2, variant: "map" },
};
