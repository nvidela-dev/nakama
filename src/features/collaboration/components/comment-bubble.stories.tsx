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
        "panel discussion bg-panel border border-line rounded-[16px] min-w-0 [&_h3]:mt-7 max-[1000px]:p-5.5 max-[700px]:p-6 lg:compact:p-4 lg:compact:rounded-[10px] lg:compact:[&_h3]:mt-4.5 mt-5 p-3 [&_>_.muted]:text-[10px] [&_>_.muted]:leading-[1.45] [&_>_.muted]:mt-0 [&_>_.muted]:mx-0 [&_>_.muted]:mb-3"
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
      <ol className={"comment-list list-none p-0 grid gap-1.5 my-3 mx-0"}>
        <li
          className={
            "comment-item py-3.5 border-b-line wrap-anywhere target:[outline:2px_solid_var(--color-lime)] target:[outline-offset:4px] flex p-0 border-0 min-w-0"
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
            "comment-item py-3.5 border-b-line wrap-anywhere target:[outline:2px_solid_var(--color-lime)] target:[outline-offset:4px] flex p-0 border-0 min-w-0"
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
        <p role="status" className={"mb-[1em] mt-0 text-muted"}>
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
