import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProgressMarker } from "./progress-marker";
const meta = {
  title: "UI/Progress marker",
  component: ProgressMarker,
  args: { value: 2, max: 3, label: "2 of 3 questions answered" },
} satisfies Meta<typeof ProgressMarker>;
export default meta;
export const Partial: StoryObj<typeof meta> = {};
export const Complete: StoryObj<typeof meta> = {
  args: { value: 3, label: "3 of 3 questions answered" },
};
export const Empty: StoryObj<typeof meta> = {
  args: { value: 0, label: "0 of 3 questions answered" },
};
