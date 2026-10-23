export type ChatReference = {
  kind: "project" | "artifact";
  id: string;
  projectId: string;
  name: string;
  projectName: string;
};
export type ReferenceResults = { items: ChatReference[]; hasMore: boolean };
const uuid = "[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}";
const referencePattern = new RegExp(
  `\\[([^\\]\\n]{1,160})\\]\\((/projects/${uuid}(?:/artifacts/${uuid})?)\\)|https?:\\/\\/[^\\s<>]+`,
  "g",
);
export type CommentPart = { text: string; href?: string };
/** Only canonical internal routes and ordinary HTTP(S) URLs become links. Never render HTML. */
export function commentParts(content: string): CommentPart[] {
  const parts: CommentPart[] = [];
  let index = 0;
  for (const match of content.matchAll(referencePattern)) {
    if (match.index > index) parts.push({ text: content.slice(index, match.index) });
    parts.push({ text: match[1] ?? match[0], href: match[2] ?? match[0] });
    index = match.index + match[0].length;
  }
  if (index < content.length) parts.push({ text: content.slice(index) });
  return parts;
}
export function referenceText(item: ChatReference) {
  const label =
    item.name
      .replace(/[\[\]\\\r\n]/g, " ")
      .trim()
      .slice(0, 160) || item.kind;
  return `[${label}](/projects/${item.projectId}${item.kind === "artifact" ? `/artifacts/${item.id}` : ""})`;
}
export function insertReference(content: string, item: ChatReference, start: number, end: number) {
  const before = content.slice(0, start),
    after = content.slice(end);
  const inserted = `${before && !/\s$/.test(before) ? " " : ""}${referenceText(item)}${after && /^\s/.test(after) ? "" : " "}`;
  const next = before + inserted + after;
  return next.length > 4000
    ? undefined
    : { content: next, cursor: before.length + inserted.length };
}
