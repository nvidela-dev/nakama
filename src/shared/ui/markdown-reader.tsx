"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
export function MarkdownReader({
  content,
  label = "Markdown reader",
  externalImageLabel = "External image",
  completedLabel = "Completed item",
  incompleteLabel = "Incomplete item",
}: {
  content: string;
  label?: string;
  externalImageLabel?: string;
  completedLabel?: string;
  incompleteLabel?: string;
}) {
  return (
    <article className="markdown-reader" aria-label={label}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          input: ({ checked }) => (
            <input
              type="checkbox"
              disabled
              checked={checked ?? false}
              aria-label={checked ? completedLabel : incompleteLabel}
            />
          ),
          a: ({ href, children }) =>
            href ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ src, alt }) => (
            <a
              href={typeof src === "string" ? src : undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              {alt || externalImageLabel}
            </a>
          ),
        }}
      >
        {content}
      </Markdown>
    </article>
  );
}
