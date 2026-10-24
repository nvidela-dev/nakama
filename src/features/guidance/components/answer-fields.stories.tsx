import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AnswerFields } from "./answer-fields";
import type { NodeStatus } from "../model/flows";
function Example({ choices = false }: { choices?: boolean }) {
  const [content, setContent] = useState("A small creative project");
  const [status, setStatus] = useState<NodeStatus>("answered");
  const [choice, setChoice] = useState("");
  return (
    <div
      className={
        "workspace max-w-300 pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:max-w-none lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 min-[2000px]:compact:px-10 lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:max-w-none min-[1280px]:[&:has(>_.has-discussion)]:px-6 [&_.project-heading]:mt-0"
      }
    >
      <div className="has-discussion">
        <section
          className="answer-panel panel p-7.5 bg-panel border border-line rounded-[16px] min-w-0 max-[1000px]:p-5.5 lg:compact:p-4 lg:compact:rounded-[10px] max-[700px]:p-5"
          style={{ width: "100%", maxWidth: 600 }}
        >
          <form
            className={
              "form-stack answer-form flex flex-col gap-3 [&_label]:text-[13px] [&_label]:text-ink [&_textarea]:min-h-30 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[var(--theme-border,#4b6056)] [&_textarea]:bg-bg [&_textarea]:text-ink [&_textarea]:rounded-[8px] [&_textarea]:p-3 [&_textarea]:text-[14px] [&_textarea]:[resize:vertical] [&_small]:text-[11px] [&_small]:text-muted [&_button]:mt-2 [&_select]:bg-bg [&_select]:text-ink [&_select]:border [&_select]:border-[var(--theme-border,#4b6056)] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:outline-3 [&_select:focus-visible]:outline-solid [&_select:focus-visible]:outline-lime [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_textarea]:min-h-22.5 lg:compact:[&_textarea]:py-2 lg:compact:[&_textarea]:px-2.5 lg:compact:[&_textarea]:text-[13px] [&_input]:w-full [&_input]:border [&_input]:border-[var(--theme-border,#4b6056)] [&_input]:bg-bg [&_input]:text-ink [&_input]:rounded-[8px] [&_input]:p-3 [&_input]:text-[14px] [&_input]:[resize:vertical] lg:compact:[&_input]:py-2 lg:compact:[&_input]:px-2.5 lg:compact:[&_input]:text-[13px] lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5 lg:compact:[&_#answer]:min-h-37.5 min-w-0 [&_>_textarea]:w-full [&_>_textarea]:min-w-0 [&_>_textarea]:max-w-full [&_>_select]:w-full [&_>_select]:min-w-0 [&_>_select]:max-w-full"
            }
          >
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
