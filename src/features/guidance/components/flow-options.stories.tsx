import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FlowOptions } from "./flow-options";
function Example() {
  const [value, setValue] = useState("");
  return <FlowOptions value={value} onChange={setValue} />;
}
const meta = { title: "Features/Guided flows/Type picker", component: FlowOptions } satisfies Meta<
  typeof FlowOptions
>;
export default meta;
export const Selectable: StoryObj<typeof meta> = { render: () => <Example /> };
export const Pending: StoryObj<typeof meta> = { args: { pending: true } };
