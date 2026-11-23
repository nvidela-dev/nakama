"use client";
import { CommentComposer } from "./comment-composer";
import { searchChatReferences } from "../reference-actions";
import { Panel } from "@/shared/ui/panel";
import { useActionState, useCallback, useState } from "react";
import Link from "next/link";
import type { Comment, CommentTarget, Page } from "@/features/collaboration/model";
import { postComment } from "@/features/collaboration/actions";
import { useT } from "@/shared/i18n/provider";
import { CommentItem } from "./comment-item";
import { useCommentReadReceipts } from "./use-comment-read-receipts";
export function Discussion({
  projectId,
  target,
  label,
  comments,
  userId,
  owner,
  olderHref,
  latestHref,
}: {
  projectId: string;
  target: CommentTarget;
  label: string;
  comments: Page<Comment>;
  userId: string;
  owner: boolean;
  olderHref?: string | undefined;
  latestHref?: string | undefined;
}) {
  const t = useT();
  const list = useCommentReadReceipts(comments.items);
  const [content, setContent] = useState("");
  const loadReferences = useCallback(
    (search: string) => searchChatReferences(projectId, search),
    [projectId],
  );
  const [state, action, pending] = useActionState(
    async (previous: { error?: string; success?: string }, data: FormData) => {
      const result = await postComment(projectId, target, previous, data);
      if (result.success) {
        setContent("");
      }
      return result;
    },
    {},
  );
  return (
    <Panel
      className={"discussion mt-3 p-2.5 rounded-[10px] min-w-0 max-w-full overflow-hidden"}
      aria-label={`${t("Discussion")} · ${label}`}
    >
      <h2
        className={
          "font-sans tracking-[-0.045em] font-medium lg:compact:text-[14px] lg:compact:mb-1.5 text-[14px] leading-[1.35] mt-0 mx-0 mb-1 break-words wrap-anywhere"
        }
      >
        {t("Discussion")} · {label}
      </h2>
      {latestHref && <Link href={latestHref}>{t("Latest comments")}</Link>}
      {comments.items.length ? (
        <ol
          ref={list}
          className={"comment-list list-none p-0 grid gap-1.5 my-3 mx-0 min-w-0 max-w-full"}
        >
          {[...comments.items].reverse().map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              projectId={projectId}
              userId={userId}
              owner={owner}
            />
          ))}
        </ol>
      ) : (
        <p className={"mb-[1em] mt-0"}>{t("No comments yet.")}</p>
      )}
      {olderHref && (
        <Link
          className={
            "button secondary rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[transform:translateY(-1px)] bg-[var(--theme-selected,#344c39)] text-lime border border-[var(--theme-border,#658451)] hover:[background:var(--theme-selected,#456248)]"
          }
          href={olderHref}
        >
          {t("Older comments")}
        </Link>
      )}
      <CommentComposer
        action={action}
        content={content}
        onContentChange={setContent}
        pending={pending}
        state={state}
        loadReferences={loadReferences}
      />
    </Panel>
  );
}
