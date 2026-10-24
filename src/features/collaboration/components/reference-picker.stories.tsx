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
        "discussion mt-5 [&.panel]:p-3 [&_>_h2]:text-[14px] [&_>_h2]:leading-[1.35] [&_>_h2]:mt-0 [&_>_h2]:mx-0 [&_>_h2]:mb-1 [&_>_.muted]:text-[10px] [&_>_.muted]:leading-[1.45] [&_>_.muted]:mt-0 [&_>_.muted]:mx-0 [&_>_.muted]:mb-3"
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
        "discussion panel bg-panel border border-line rounded-[16px] min-w-0 [&_p]:text-muted [&_h3]:mt-7 max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] lg:compact:[&_h3]:mt-4.5 mt-5 p-3 [&_>_h2]:text-[14px] [&_>_h2]:leading-[1.35] [&_>_h2]:mt-0 [&_>_h2]:mx-0 [&_>_h2]:mb-1 [&_>_.muted]:text-[10px] [&_>_.muted]:leading-[1.45] [&_>_.muted]:mt-0 [&_>_.muted]:mx-0 [&_>_.muted]:mb-3"
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
