import Link from "next/link";
import { commentParts } from "../references";
export function CommentText({ content }: { content: string }) {
  return (
    <p className={"preserve-lines comment-body whitespace-pre-wrap my-2 mx-0 wrap-anywhere"}>
      {commentParts(content).map((part, index) =>
        part.href ? (
          part.href.startsWith("/") ? (
            <Link key={index} href={part.href} prefetch={false}>
              {part.text}
            </Link>
          ) : (
            <a
              key={index}
              href={part.href}
              target="_blank"
              rel="noopener noreferrer"
              className={
                "[color:inherit] focus-visible:[outline:3px_solid_var(--color-lime)] focus-visible:[outline-offset:5px] text-lime underline"
              }
            >
              {part.text}
            </a>
          )
        ) : (
          part.text
        ),
      )}
    </p>
  );
}
