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
    <section className="discussion" style={{ maxWidth: 320 }}>
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
    <section className="discussion panel" style={{ maxWidth: 320 }}>
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
