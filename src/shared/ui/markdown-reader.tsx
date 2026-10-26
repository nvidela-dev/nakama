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
    <article
      className={
        "markdown-reader text-ink wrap-anywhere text-[14px] [&_h1]:mt-[1.5em] [&_h1]:text-[28px] [&_h2]:mt-[1.5em] [&_h2]:text-[23px] [&_h3]:mt-[1.5em] [&_h3]:text-[19px] [&_pre]:overflow-auto [&_pre]:p-4 [&_pre]:bg-bg [&_pre]:border [&_pre]:border-line [&_pre]:rounded-[6px] [&_code]:font-sans [&_code]:text-[0.9em] [&_code]:text-lime [&_blockquote]:[margin-inline:0] [&_blockquote]:pl-4.5 [&_blockquote]:[border-left:3px_solid_var(--color-lime)] [&_blockquote]:text-muted [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_th]:py-2 [&_th]:px-3 [&_th]:border [&_th]:border-line [&_th]:text-left [&_td]:py-2 [&_td]:px-3 [&_td]:border [&_td]:border-line [&_td]:text-left [&_img]:max-w-full"
      }
      aria-label={label}
    >
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
              className={
                "[font:inherit] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5"
              }
            />
          ),
          a: ({ href, children }) =>
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  "text-inherit focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 text-lime underline"
                }
              >
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
              className={
                "text-inherit focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-lime focus-visible:outline-offset-5 text-lime underline"
              }
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
