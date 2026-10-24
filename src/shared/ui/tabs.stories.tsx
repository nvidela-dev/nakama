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
      listClassName={
        'project-work-tabs flex gap-1.5 mt-[-16px] mx-[-16px] mb-3.5 py-2 px-3 bg-[#13211e] border-b border-b-line rounded-[9px_9px_0_0] lg:compact:mt-[-14px] lg:compact:mb-3 [&_[role="tab"]]:bg-transparent [&_[role="tab"]]:text-muted [&_[role="tab"]]:min-h-7.5 [&_[role="tab"]]:py-1.25 [&_[role="tab"]]:px-2.75 [&_[role="tab"]]:text-[11.5px] [&_[role="tab"]]:rounded-[6px] [&_[role="tab"]]:border [&_[role="tab"]]:border-[transparent] [&_[aria-selected="true"]]:bg-[#23382e] [&_[aria-selected="true"]]:text-lime [&_[aria-selected="true"]]:border-line pointer-coarse:[&_[role="tab"]]:min-h-11'
      }
      panelClassName={
        "project-work-panel min-w-0 [&_>_.panel]:border-0 [&_>_.panel]:p-0 [&_>_.panel]:bg-transparent [&[hidden]]:hidden!"
      }
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
        {
          value: "tasks",
          label: "To-do",
          content: <p className={"mb-[1em] mt-[0]"}>Plan the next small step.</p>,
        },
        {
          value: "artifacts",
          label: "Artifacts",
          content: <p className={"mb-[1em] mt-[0]"}>Your project outputs.</p>,
        },
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
