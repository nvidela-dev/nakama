"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useT } from "./language";
export function MarkdownReader({content}:{content:string}) {
  const t=useT();
  return <article className="markdown-reader" aria-label={t("Markdown reader")}>
    <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
      a:({href,children})=>href?<a href={href} target="_blank" rel="noopener noreferrer">{children}</a>:<span>{children}</span>,
      img:({src,alt})=><a href={typeof src==="string"?src:undefined} target="_blank" rel="noopener noreferrer">{alt||t("External image")}</a>,
    }}>{content}</Markdown>
  </article>;
}
