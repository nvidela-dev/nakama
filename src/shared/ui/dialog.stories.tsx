import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Dialog } from "./dialog";
import { Button } from "./button";
import { Input } from "./controls";
function Example() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="story-dialog-title"
        className={
          'project-setup-dialog w-[min(760px,_calc(100vw_-_32px))] max-h-[90dvh] overflow-y-auto bg-panel text-ink border border-line rounded-[12px] p-6 backdrop:[background:var(--theme-map,#06100dd9)] [&_>_.muted]:text-[13px] [&_>_.muted]:my-3.5 [&_>_.muted]:mx-0 [&_.form-stack_textarea]:min-h-22.5 [&_.text-button[aria-pressed="true"]]:text-lime [&_.text-button[aria-pressed="true"]]:underline max-[700px]:p-4.5'
        }
      >
        <h2
          id="story-dialog-title"
          className={
            "mb-[0.83em] mt-0 font-mono tracking-[-0.045em] text-[28px] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3"
          }
        >
          Create a project
        </h2>
        <label htmlFor="dialog-name">Project name</label>
        <Input id="dialog-name" autoFocus />
        <Button onClick={() => setOpen(false)}>Close dialog</Button>
      </Dialog>
    </>
  );
}
const meta = {
  title: "UI/Dialog",
  component: Dialog,
  args: { open: false, onClose: () => {}, label: "Example dialog" },
} satisfies Meta<typeof Dialog>;
export default meta;
export const Interactive: StoryObj<typeof meta> = { render: () => <Example /> };
