import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EmptyState, Panel, StatusMessage } from "./panel";
import { Feedback } from "./feedback";
import { WaveMark } from "./wave-mark";
const meta = { title: "UI/Feedback and surfaces", component: Panel } satisfies Meta<typeof Panel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Surface: Story = {
  render: () => (
    <Panel style={{ maxWidth: 420 }}>
      <WaveMark />
      <h2
        className={
          "mb-[0.83em] mt-0 font-sans tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3"
        }
      >
        Project output
      </h2>
      <p className={"mb-[1em] mt-0"}>Save a draft before marking this output ready.</p>
    </Panel>
  ),
};
export const Empty: Story = {
  render: () => (
    <EmptyState title="No artifacts yet.">
      <p className={"mb-[1em] mt-0"}>Start with a work in progress.</p>
    </EmptyState>
  ),
};
export const Success: Story = { render: () => <StatusMessage>Changes saved.</StatusMessage> };
export const Error: Story = {
  render: () => (
    <StatusMessage tone="error">Could not save. Your draft is still here.</StatusMessage>
  ),
};
export const TranslatedFeedback: Story = {
  render: () => <Feedback state={{ success: "Project updated." }} />,
};
