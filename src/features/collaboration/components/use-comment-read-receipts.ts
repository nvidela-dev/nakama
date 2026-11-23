"use client";
import { observeCommentReads } from "./observe-comment-reads";
import { useEffect, useRef } from "react";
import { readComments } from "@/features/notifications/actions";
import { commentsReadEvent } from "@/features/notifications/events";
import type { Comment } from "../model";

export function useCommentReadReceipts(items: Comment[]) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!list.current) return;
    return observeCommentReads(list.current, readComments, () =>
      window.dispatchEvent(new Event(commentsReadEvent)),
    );
  }, [items]);
  return list;
}
