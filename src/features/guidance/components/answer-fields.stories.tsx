import { FormStack, Workspace } from "@/shared/ui/workspace-layout";
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AnswerFields } from "./answer-fields";
import type { NodeStatus } from "../model/flows";
function Example({ choices = false }: { choices?: boolean }) {
  const [content, setContent] = useState("A small creative project");
  const [status, setStatus] = useState<NodeStatus>("answered");
  const [choice, setChoice] = useState("");
  return (
    <Workspace>
      <div className="has-discussion">
        <section
          className="answer-panel panel p-7.5 bg-panel border border-line rounded-[16px] min-w-0 max-[1000px]:p-5.5 lg:compact:p-4 lg:compact:rounded-[10px] max-[700px]:p-5"
          style={{ width: "100%", maxWidth: 600 }}
        >
          <FormStack className="answer-form [&_label]:text-[13px] [&_label]:text-ink [&_button]:mt-2 [&_input]:w-full lg:compact:[&_#answer]:min-h-37.5 min-w-0 [&_>_textarea]:w-full [&_>_textarea]:min-w-0 [&_>_textarea]:max-w-full [&_>_select]:w-full [&_>_select]:min-w-0 [&_>_select]:max-w-full">
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
          </FormStack>
        </section>
      </div>
    </Workspace>
  );
}
const meta = { title: "Features/Guided flows/Answer fields", component: Example } satisfies Meta<
  typeof Example
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Stacked: Story = {};
export const WithDirection: Story = { args: { choices: true } };
