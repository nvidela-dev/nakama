import { CommentComposer } from "./comment-composer";
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ReferencePicker } from "./reference-picker";
import { CommentText } from "./comment-text";
import { referenceText, type ReferenceResults } from "../references";
const fixtures: ReferenceResults = {
  hasMore: false,
  items: [
    {
      kind: "project",
      id: "00000000-0000-4000-8000-000000000001",
      projectId: "00000000-0000-4000-8000-000000000001",
      name: "Example project",
      projectName: "Example project",
    },
    {
      kind: "artifact",
      id: "00000000-0000-4000-8000-000000000002",
      projectId: "00000000-0000-4000-8000-000000000001",
      name: "Design draft",
      projectName: "Example project",
    },
  ],
};
async function load(search: string): Promise<ReferenceResults> {
  if (search === "error") throw new Error("Synthetic error");
  return {
    ...fixtures,
    items: fixtures.items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
  };
}
function Example() {
  const [content, setContent] = useState("Keep this draft. ");
  return (
    <section
      className={
        'discussion mt-5 [&.panel]:p-3 [&_>_h2]:text-[14px] [&_>_h2]:leading-[1.35] [&_>_h2]:mt-0 [&_>_h2]:mx-0 [&_>_h2]:mb-1 [&_>_.muted]:text-[10px] [&_>_.muted]:leading-[1.45] [&_>_.muted]:mt-0 [&_>_.muted]:mx-0 [&_>_.muted]:mb-3 [&_.comment-list]:grid [&_.comment-list]:gap-1.5 [&_.comment-list]:my-3 [&_.comment-list]:mx-0 [&_.comment-item]:flex [&_.comment-item]:p-0 [&_.comment-item]:border-0 [&_.comment-item]:min-w-0 [&_.comment-body]:text-ink [&_.comment-body]:my-0.5 [&_.comment-body]:mx-0 [&_.comment-body]:text-[12px] [&_.comment-body]:leading-[1.45] [&_.comment-meta]:[color:#c4d2ca] [&_.comment-meta]:justify-end [&_.comment-meta]:gap-1.25 [&_.comment-meta]:text-[10px] [&_.comment-meta]:leading-[1.3] [&_.comment-meta]:mt-0.75 [&_.comment-compose]:grid [&_.comment-compose]:grid-cols-[auto_minmax(0,_1fr)_auto] [&_.comment-compose]:items-end [&_.comment-compose]:gap-[5px_8px] [&_.comment-compose]:mt-3 [&_.comment-compose]:pt-2.25 [&_.comment-compose]:border-t [&_.comment-compose]:border-t-line [&_.comment-compose_textarea]:min-h-9.5 [&_.comment-compose_textarea]:max-h-40 [&_.comment-compose_textarea]:py-1.75 [&_.comment-compose_textarea]:px-2.25 [&_.comment-compose_textarea]:text-[12px] [&_.comment-compose_textarea]:leading-[1.4] [&_.comment-compose_textarea]:rounded-[14px] [&_.comment-compose_>_button]:[grid-column:2] [&_.comment-compose_>_button]:[grid-row:2] [&_.comment-compose_>_button]:w-9 [&_.comment-compose_>_button]:min-h-9 [&_.comment-compose_>_button]:p-2 [&_.comment-compose_>_button]:rounded-full [&_.comment-edit]:gap-1.5 [&_.comment-edit_textarea]:text-[12px] [&_.comment-edit_textarea]:p-1.75 [&_.comment-controls]:my-1.25 [&_.comment-controls]:mx-0 [&_.comment-controls]:gap-1 [&_.comment-controls_button]:min-h-7 [&_.comment-controls_button]:text-[10px] [&_.comment-controls_button]:py-1 [&_.comment-controls_button]:px-1.75 [&_.comment-confirm_p]:text-[11px] [&_.comment-confirm_p]:my-1.25 [&_.comment-confirm_p]:mx-0 pointer-coarse:[&_.comment-compose_>_button]:w-11 pointer-coarse:[&_.comment-compose_>_button]:min-h-11 pointer-coarse:[&_.comment-controls_button]:min-h-11 [&_.comment-compose_>_textarea]:[grid-column:2] [&_.comment-compose_>_textarea]:[grid-row:2] [&_.comment-compose_>_button[type="submit"]]:[grid-column:3] [&_.comment-compose_>_.comment-reference-trigger]:[grid-column:1] [&_.comment-compose_>_.comment-reference-trigger]:[grid-row:2] [&_.comment-compose_>_.comment-reference-trigger]:w-7.5 [&_.comment-compose_>_.comment-reference-trigger]:min-h-9 [&_.comment-compose_>_.comment-reference-trigger]:p-1.25'
      }
      style={{ maxWidth: 320 }}
    >
      <ReferencePicker
        load={load}
        onSelect={(item) => setContent((value) => value + referenceText(item))}
      />
      <CommentText content={content} />
    </section>
  );
}
const meta = { title: "Collaboration/Reference picker", component: Example } satisfies Meta<
  typeof Example
>;
export default meta;
export const SearchAndInsert: StoryObj<typeof meta> = {};

function ComposerExample() {
  const [content, setContent] = useState("");
  const [posted, setPosted] = useState("");
  return (
    <section
      className={
        'discussion panel bg-panel border border-line rounded-[16px] min-w-0 [&_p]:text-muted [&_h3]:mt-7 max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] lg:compact:[&_h3]:mt-4.5 mt-5 p-3 [&_>_h2]:text-[14px] [&_>_h2]:leading-[1.35] [&_>_h2]:mt-0 [&_>_h2]:mx-0 [&_>_h2]:mb-1 [&_>_.muted]:text-[10px] [&_>_.muted]:leading-[1.45] [&_>_.muted]:mt-0 [&_>_.muted]:mx-0 [&_>_.muted]:mb-3 [&_.comment-list]:grid [&_.comment-list]:gap-1.5 [&_.comment-list]:my-3 [&_.comment-list]:mx-0 [&_.comment-item]:flex [&_.comment-item]:p-0 [&_.comment-item]:border-0 [&_.comment-item]:min-w-0 [&_.comment-body]:text-ink [&_.comment-body]:my-0.5 [&_.comment-body]:mx-0 [&_.comment-body]:text-[12px] [&_.comment-body]:leading-[1.45] [&_.comment-meta]:[color:#c4d2ca] [&_.comment-meta]:justify-end [&_.comment-meta]:gap-1.25 [&_.comment-meta]:text-[10px] [&_.comment-meta]:leading-[1.3] [&_.comment-meta]:mt-0.75 [&_.comment-compose]:grid [&_.comment-compose]:grid-cols-[auto_minmax(0,_1fr)_auto] [&_.comment-compose]:items-end [&_.comment-compose]:gap-[5px_8px] [&_.comment-compose]:mt-3 [&_.comment-compose]:pt-2.25 [&_.comment-compose]:border-t [&_.comment-compose]:border-t-line [&_.comment-compose_textarea]:min-h-9.5 [&_.comment-compose_textarea]:max-h-40 [&_.comment-compose_textarea]:py-1.75 [&_.comment-compose_textarea]:px-2.25 [&_.comment-compose_textarea]:text-[12px] [&_.comment-compose_textarea]:leading-[1.4] [&_.comment-compose_textarea]:rounded-[14px] [&_.comment-compose_>_button]:[grid-column:2] [&_.comment-compose_>_button]:[grid-row:2] [&_.comment-compose_>_button]:w-9 [&_.comment-compose_>_button]:min-h-9 [&_.comment-compose_>_button]:p-2 [&_.comment-compose_>_button]:rounded-full [&_.comment-edit]:gap-1.5 [&_.comment-edit_textarea]:text-[12px] [&_.comment-edit_textarea]:p-1.75 [&_.comment-controls]:my-1.25 [&_.comment-controls]:mx-0 [&_.comment-controls]:gap-1 [&_.comment-controls_button]:min-h-7 [&_.comment-controls_button]:text-[10px] [&_.comment-controls_button]:py-1 [&_.comment-controls_button]:px-1.75 [&_.comment-confirm_p]:text-[11px] [&_.comment-confirm_p]:my-1.25 [&_.comment-confirm_p]:mx-0 pointer-coarse:[&_.comment-compose_>_button]:w-11 pointer-coarse:[&_.comment-compose_>_button]:min-h-11 pointer-coarse:[&_.comment-controls_button]:min-h-11 [&_.comment-compose_>_textarea]:[grid-column:2] [&_.comment-compose_>_textarea]:[grid-row:2] [&_.comment-compose_>_button[type="submit"]]:[grid-column:3] [&_.comment-compose_>_.comment-reference-trigger]:[grid-column:1] [&_.comment-compose_>_.comment-reference-trigger]:[grid-row:2] [&_.comment-compose_>_.comment-reference-trigger]:w-7.5 [&_.comment-compose_>_.comment-reference-trigger]:min-h-9 [&_.comment-compose_>_.comment-reference-trigger]:p-1.25'
      }
      style={{ maxWidth: 320 }}
    >
      <CommentComposer
        content={content}
        onContentChange={setContent}
        pending={false}
        state={{}}
        loadReferences={load}
        action={async (data) => {
          setPosted(String(data.get("content")));
          setContent("");
        }}
      />
      {posted && <CommentText content={posted} />}
    </section>
  );
}
export const Composer: StoryObj<typeof meta> = { render: () => <ComposerExample /> };
