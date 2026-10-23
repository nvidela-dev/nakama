import Link from "next/link";
import { commentParts } from "../references";
export function CommentText({ content }: { content: string }) {
  return (
    <p className="preserve-lines comment-body">
      {commentParts(content).map((part, index) =>
        part.href ? (
          part.href.startsWith("/") ? (
            <Link key={index} href={part.href} prefetch={false}>
              {part.text}
            </Link>
          ) : (
            <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">
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
