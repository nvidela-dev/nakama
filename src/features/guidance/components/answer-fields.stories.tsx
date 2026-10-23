import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AnswerFields } from "./answer-fields";
import type { NodeStatus } from "../model/flows";
function Example({ choices = false }: { choices?: boolean }) {
  const [content, setContent] = useState("A small creative project");
  const [status, setStatus] = useState<NodeStatus>("answered");
  const [choice, setChoice] = useState("");
  return (
    <div className="workspace">
      <div className="has-discussion">
        <section className="answer-panel panel" style={{ width: "100%", maxWidth: 600 }}>
          <form className="form-stack answer-form">
            <AnswerFields
              node={choices ? { choices: ["Continue", "Revisit"] } : {}}
              content={content}
              status={status}
              choice={choice}
              pending={false}
              onContentChange={setContent}
              onChoiceChange={setChoice}
              onStatusChange={setStatus}
            />
          </form>
        </section>
      </div>
    </div>
  );
}
const meta = { title: "Features/Guided flows/Answer fields", component: Example } satisfies Meta<
  typeof Example
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Stacked: Story = {};
export const WithDirection: Story = { args: { choices: true } };
