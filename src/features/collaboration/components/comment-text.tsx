import Link from "next/link";
import { commentParts } from "../references";
export function CommentText({ content }: { content: string }) {
  return (
    <p
      className={
        "preserve-lines comment-body whitespace-pre-wrap my-0.5 mx-0 wrap-anywhere text-ink text-[12px] leading-[1.45]"
      }
    >
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
                "text-inherit focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 text-lime underline"
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
