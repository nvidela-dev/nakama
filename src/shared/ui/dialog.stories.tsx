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
        className="project-setup-dialog"
      >
        <h2 id="story-dialog-title">Create a project</h2>
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
