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
        "workspace max-w-300 pt-12 px-[6%] pb-22.5 m-auto min-h-[70vh] max-[700px]:pt-6 lg:compact:max-w-[none] lg:compact:pt-5 lg:compact:px-7 lg:compact:pb-9 lg:compact:min-h-[calc(100vh_-_126px)] lg:compact:[&.narrow]:max-w-190 lg:compact:[&_button]:min-h-8.5 lg:compact:[&_button]:py-2 lg:compact:[&_button]:px-3 lg:compact:[&_button]:text-[12px] lg:compact:[&_button]:rounded-[7px] lg:compact:[&_.button]:min-h-8.5 lg:compact:[&_.button]:py-2 lg:compact:[&_.button]:px-3 lg:compact:[&_.button]:text-[12px] lg:compact:[&_.button]:rounded-[7px] min-[2000px]:compact:[padding-inline:40px] lg:compact:[&_.eyebrow]:mb-1.5 min-[1280px]:[&:has(>_.has-discussion)]:max-w-[none] min-[1280px]:[&:has(>_.has-discussion)]:[padding-inline:24px] [&_.project-heading]:mt-0 compact:[&_.journey-content_>_.button.secondary]:text-[11px] compact:[&_.journey-content_>_.button.secondary]:min-h-7.5 compact:[&_.journey-content_>_.button.secondary]:py-1.5 compact:[&_.journey-content_>_.button.secondary]:px-2.5 pointer-coarse:compact:[&_.journey-content_>_.button.secondary]:min-h-11 lg:compact:[&_.answer-panel_h2]:my-1.5 lg:compact:[&_.answer-panel_h2]:mx-0 lg:compact:[&_.answer-panel_h2]:text-[14px] lg:compact:[&_.answer-panel_h2]:leading-[1.3] compact:[&_.stage-heading-row_.miniview-icon]:w-8 compact:[&_.stage-heading-row_.miniview-icon]:h-8 compact:[&_.stage-heading-row_.miniview-icon]:min-h-8 compact:[&_.stage-heading-row_.miniview-icon]:min-w-8 compact:[&_.stage-heading-row_.miniview-icon]:p-0 compact:[&_.stage-heading-row_.miniview-icon]:rounded-[6px] pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:w-11 pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:h-11 pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:min-w-11 pointer-coarse:compact:[&_.stage-heading-row_.miniview-icon]:min-h-11 compact:[&_.journey-stage-heading_.stage-heading-row_h2]:m-0 compact:[&_.journey-stage-heading_.stage-heading-row_h2]:text-[13px] compact:[&_.journey-stage-heading_.stage-heading-row_h2]:leading-[1.3]"
      }
    >
      <div
        className={
          "has-discussion min-[1280px]:compact:[&_.stage-card_>_div]:grid-cols-[minmax(0,_1fr)] min-[1280px]:compact:[&_.stage-card_small]:[grid-column:1] min-[1280px]:compact:[&_.stage-label]:[grid-row:auto] [&_>_.project-working-column]:[grid-column:1] [&_>_.project-working-column]:[grid-row:1] [&_>_.project-discussion-column]:[grid-column:1] [&_>_.project-discussion-column]:[grid-row:2] [&_>_.project-discussion-column]:min-w-0 [&_>_.project-discussion-column_>_.discussion]:mt-0 [&_>_.project-sidebar]:[grid-column:2] [&_>_.project-sidebar]:[grid-row:1_/_span_2] max-[700px]:[&_>_.project-sidebar]:[grid-column:1] max-[700px]:[&_>_.project-sidebar]:[grid-row:3] min-[1280px]:[&_>_.project-working-column]:[grid-column:2] min-[1280px]:[&_>_.project-discussion-column]:[grid-row:1] min-[1280px]:[&_>_.project-discussion-column]:sticky min-[1280px]:[&_>_.project-discussion-column]:top-5 min-[1280px]:[&_>_.project-discussion-column]:max-h-[calc(100dvh_-_40px)] min-[1280px]:[&_>_.project-sidebar]:[grid-column:3] min-[1280px]:[&_>_.project-sidebar]:[grid-row:1]"
        }
      >
        <section
          className={
            "answer-panel panel p-7.5 bg-panel border border-line rounded-[16px] min-w-0 [&_p]:text-muted [&_h3]:mt-7 max-[1000px]:p-5.5 lg:compact:p-4 lg:compact:rounded-[10px] lg:compact:[&_h3]:mt-4.5 [&_h2]:text-[16px] [&_h2]:leading-[1.3] [&_h2]:tracking-[-0.25px] [&_h2:focus]:[outline:none] max-[700px]:p-5 lg:compact:[&_h2]:my-1.5 lg:compact:[&_h2]:mx-0 lg:compact:[&_h2]:text-[14px]"
          }
          style={{ width: "100%", maxWidth: 600 }}
        >
          <form
            className={
              "form-stack answer-form flex flex-col gap-3 [&_label]:text-[13px] [&_label]:text-ink [&_textarea]:min-h-30 [&_textarea]:w-full [&_textarea]:border [&_textarea]:border-[#4b6056] [&_textarea]:bg-[#101c1b] [&_textarea]:text-ink [&_textarea]:rounded-[8px] [&_textarea]:p-3 [&_textarea]:text-[14px] [&_textarea]:[resize:vertical] [&_small]:text-[11px] [&_small]:text-muted [&_button]:mt-2 [&_select]:bg-[#101c1b] [&_select]:text-ink [&_select]:border [&_select]:border-[#4b6056] [&_select]:rounded-[8px] [&_select]:p-3 [&_select]:[font:inherit] [&_select]:text-[13px] [&_select]:max-w-full [&_select:focus-visible]:[outline:3px_solid_var(--color-lime)] [&_select:focus-visible]:[outline-offset:4px] lg:compact:gap-1.75 lg:compact:[&_textarea]:min-h-22.5 lg:compact:[&_textarea]:py-2 lg:compact:[&_textarea]:px-2.5 lg:compact:[&_textarea]:text-[13px] lg:compact:[&_button]:mt-1 [&_input]:w-full [&_input]:border [&_input]:border-[#4b6056] [&_input]:bg-[#101c1b] [&_input]:text-ink [&_input]:rounded-[8px] [&_input]:p-3 [&_input]:text-[14px] [&_input]:[resize:vertical] lg:compact:[&_input]:py-2 lg:compact:[&_input]:px-2.5 lg:compact:[&_input]:text-[13px] lg:compact:[&_select]:py-2 lg:compact:[&_select]:px-2.5 lg:compact:[&_#answer]:min-h-37.5 min-w-0 [&_>_textarea]:w-full [&_>_textarea]:min-w-0 [&_>_textarea]:max-w-full [&_>_select]:w-full [&_>_select]:min-w-0 [&_>_select]:max-w-full"
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
