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
    <section className="panel discussion" style={{ width: 320, maxWidth: "100%" }}>
      <h2>{t("Discussion")}</h2>
      <ol className="comment-list">
        <li className="comment-item">
          <CommentBubble
            own={false}
            author="Alex"
            dateTime="2026-10-23T12:30:00Z"
            dateLabel="23 Oct 2026, 12:30 UTC"
            timeLabel="12:30"
          >
            <p className="comment-body">The first design is ready. What do you think?</p>
          </CommentBubble>
        </li>
        <li className="comment-item">
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
            <p className="comment-body">Looks good! Let’s try the smaller layout.</p>
          </CommentBubble>
        </li>
      </ol>
      {action && <p role="status">{t(action)}</p>}
    </section>
  );
}
const meta = { title: "Collaboration/Conversation", component: Conversation } satisfies Meta<
  typeof Conversation
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Messages: Story = {};
