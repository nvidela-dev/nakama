import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { CommentBubble } from "./comment-bubble";
import { ActionMenu } from "@/shared/ui/action-menu";
import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/icon";
import { useT } from "@/shared/i18n/provider";
function Conversation() {
  const t = useT();
  const [action, setAction] = useState("");
  return (
    <section
      className={
        'panel discussion bg-panel border border-line rounded-[16px] min-w-0 [&_h3]:mt-7 max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] lg:compact:[&_h3]:mt-4.5 mt-5 p-3 [&_>_.muted]:text-[10px] [&_>_.muted]:leading-[1.45] [&_>_.muted]:mt-0 [&_>_.muted]:mx-0 [&_>_.muted]:mb-3 [&_.comment-meta]:[color:#c4d2ca] [&_.comment-meta]:justify-end [&_.comment-meta]:gap-1.25 [&_.comment-meta]:text-[10px] [&_.comment-meta]:leading-[1.3] [&_.comment-meta]:mt-0.75 [&_.comment-compose]:grid [&_.comment-compose]:grid-cols-[auto_minmax(0,_1fr)_auto] [&_.comment-compose]:items-end [&_.comment-compose]:gap-[5px_8px] [&_.comment-compose]:mt-3 [&_.comment-compose]:pt-2.25 [&_.comment-compose]:border-t [&_.comment-compose]:border-t-line [&_.comment-compose_textarea]:min-h-9.5 [&_.comment-compose_textarea]:max-h-40 [&_.comment-compose_textarea]:py-1.75 [&_.comment-compose_textarea]:px-2.25 [&_.comment-compose_textarea]:text-[12px] [&_.comment-compose_textarea]:leading-[1.4] [&_.comment-compose_textarea]:rounded-[14px] [&_.comment-compose_>_button]:[grid-column:2] [&_.comment-compose_>_button]:[grid-row:2] [&_.comment-compose_>_button]:w-9 [&_.comment-compose_>_button]:min-h-9 [&_.comment-compose_>_button]:p-2 [&_.comment-compose_>_button]:rounded-full [&_.comment-edit]:gap-1.5 [&_.comment-edit_textarea]:text-[12px] [&_.comment-edit_textarea]:p-1.75 [&_.comment-controls]:my-1.25 [&_.comment-controls]:mx-0 [&_.comment-controls]:gap-1 [&_.comment-controls_button]:min-h-7 [&_.comment-controls_button]:text-[10px] [&_.comment-controls_button]:py-1 [&_.comment-controls_button]:px-1.75 [&_.comment-confirm_p]:text-[11px] [&_.comment-confirm_p]:my-1.25 [&_.comment-confirm_p]:mx-0 pointer-coarse:[&_.comment-compose_>_button]:w-11 pointer-coarse:[&_.comment-compose_>_button]:min-h-11 pointer-coarse:[&_.comment-controls_button]:min-h-11 [&_.comment-compose_>_textarea]:[grid-column:2] [&_.comment-compose_>_textarea]:[grid-row:2] [&_.comment-compose_>_button[type="submit"]]:[grid-column:3] [&_.comment-compose_>_.comment-reference-trigger]:[grid-column:1] [&_.comment-compose_>_.comment-reference-trigger]:[grid-row:2] [&_.comment-compose_>_.comment-reference-trigger]:w-7.5 [&_.comment-compose_>_.comment-reference-trigger]:min-h-9 [&_.comment-compose_>_.comment-reference-trigger]:p-1.25'
      }
      style={{ width: 320, maxWidth: "100%" }}
    >
      <h2
        className={
          "font-mono tracking-[-0.045em] font-medium lg:compact:text-[19px] lg:compact:mb-3 text-[14px] leading-[1.35] mt-0 mx-0 mb-1"
        }
      >
        {t("Discussion")}
      </h2>
      <ol className={"comment-list list-none p-0 grid gap-[6px] my-3 mx-0"}>
        <li
          className={
            "comment-item [padding-block:14px] border-b-line wrap-anywhere [&:target]:[outline:2px_solid_var(--color-lime)] [&:target]:[outline-offset:4px] flex p-0 border-0 min-w-0"
          }
        >
          <CommentBubble
            own={false}
            author="Alex"
            dateTime="2026-10-23T12:30:00Z"
            dateLabel="23 Oct 2026, 12:30 UTC"
            timeLabel="12:30"
          >
            <p
              className={
                "comment-body wrap-anywhere [&_a]:text-lime [&_a]:underline text-ink my-0.5 mx-0 text-[12px] leading-[1.45]"
              }
            >
              The first design is ready. What do you think?
            </p>
          </CommentBubble>
        </li>
        <li
          className={
            "comment-item [padding-block:14px] border-b-line wrap-anywhere [&:target]:[outline:2px_solid_var(--color-lime)] [&:target]:[outline-offset:4px] flex p-0 border-0 min-w-0"
          }
        >
          <CommentBubble
            own
            author="Sam"
            dateTime="2026-10-23T12:32:00Z"
            dateLabel="23 Oct 2026, 12:32 UTC"
            timeLabel="12:32"
            actions={
              <ActionMenu label={t("Comment actions")}>
                <Button variant="ghost" onClick={() => setAction("Edit comment")}>
                  <Icon name="edit" />
                  {t("Edit comment")}
                </Button>
                <Button variant="ghost" onClick={() => setAction("Remove comment")}>
                  <Icon name="delete" />
                  {t("Remove comment")}
                </Button>
              </ActionMenu>
            }
          >
            <p
              className={
                "comment-body wrap-anywhere [&_a]:text-lime [&_a]:underline text-ink my-0.5 mx-0 text-[12px] leading-[1.45]"
              }
            >
              Looks good! Let’s try the smaller layout.
            </p>
          </CommentBubble>
        </li>
      </ol>
      {action && (
        <p role="status" className={"mb-[1em] mt-[0] text-muted"}>
          {t(action)}
        </p>
      )}
    </section>
  );
}
const meta = { title: "Collaboration/Conversation", component: Conversation } satisfies Meta<
  typeof Conversation
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Messages: Story = {};
