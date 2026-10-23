import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, IconButton } from "./button";
const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Save changes" },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Pending: Story = { args: { pending: true, children: "Saving…" } };
export const Disabled: Story = { args: { disabled: true } };
export const Icon: Story = {
  render: () => (
    <IconButton variant="ghost" label="Unread comments">
      ♧
    </IconButton>
  ),
};
