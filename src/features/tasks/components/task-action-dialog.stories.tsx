import type { Meta } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { TaskActionDialog } from "./task-action-dialog";
import type { Editor } from "../model";
export default { title: "Tasks/Action dialog" } satisfies Meta;
function AddTask() {
  const [editor, setEditor] = useState<Editor | null>(null);
  return (
    <>
      <Button onClick={() => setEditor({ kind: "add", title: "", revision: 1 })}>Add task</Button>
      {editor && (
        <TaskActionDialog
          editor={editor}

          close={() => setEditor(null)}
          pending={false}
          errorBox={null}
          conflict={false}
          run={async () => {
            setEditor(null);
            return true;
          }}
        />
      )}
    </>
  );
}
export const Add = { render: () => <AddTask /> };
