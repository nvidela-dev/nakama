import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/shared/ui/button";
import { ProjectSetup } from "./project-setup";
function Example() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open setup</Button>
      <ProjectSetup
        open={open}
        onClose={() => setOpen(false)}
        initialSourceIds={[]}
        createAction={async () => ({ error: "Preview only: your draft is still here." })}
      />
    </>
  );
}
const meta = { title: "Features/Projects/Project setup", component: Example } satisfies Meta<
  typeof Example
>;
export default meta;
export const Draft: StoryObj<typeof meta> = {};
