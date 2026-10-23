import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tabs } from "./tabs";
import { Input } from "./controls";
function Example() {
  const [value, setValue] = useState("steps");
  return (
    <Tabs
      label="Project workspace"
      value={value}
      onChange={setValue}
      listClassName="project-work-tabs"
      panelClassName="project-work-panel"
      items={[
        {
          value: "steps",
          label: "Project steps",
          content: (
            <>
              <label htmlFor="draft">Draft</label>
              <Input id="draft" />
            </>
          ),
        },
        { value: "tasks", label: "To-do", content: <p>Plan the next small step.</p> },
        { value: "artifacts", label: "Artifacts", content: <p>Your project outputs.</p> },
      ]}
    />
  );
}
const meta = {
  title: "UI/Tabs",
  component: Tabs,
  args: { items: [], value: "steps", onChange: () => {}, label: "Example tabs" },
} satisfies Meta<typeof Tabs>;
export default meta;
export const PersistentPanels: StoryObj<typeof meta> = { render: () => <Example /> };
