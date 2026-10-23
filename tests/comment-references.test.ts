import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commentParts,
  insertReference,
  referenceText,
  type ChatReference,
} from "../src/features/collaboration/references";
const projectId = "00000000-0000-4000-8000-000000000001";
const item: ChatReference = {
  kind: "artifact",
  id: "00000000-0000-4000-8000-000000000002",
  projectId,
  name: "Design draft",
  projectName: "Example",
};
test("references are named canonical links while arbitrary Markdown and HTML stay text", () => {
  const text = referenceText(item);
  assert.deepEqual(commentParts(`See ${text} and https://example.com`), [
    { text: "See " },
    { text: "Design draft", href: `/projects/${projectId}/artifacts/${item.id}` },
    { text: " and " },
    { text: "https://example.com", href: "https://example.com" },
  ]);
  assert.deepEqual(commentParts("[bad](javascript:alert(1)) <script>bad</script>"), [
    { text: "[bad](javascript:alert(1)) <script>bad</script>" },
  ]);
  assert.deepEqual(commentParts("[bad](//example.com) [bad](/admin)"), [
    { text: "[bad](//example.com) [bad](/admin)" },
  ]);
  assert.equal(
    commentParts(referenceText({ ...item, name: "[New]\\\n draft" }))[0]?.href,
    `/projects/${projectId}/artifacts/${item.id}`,
  );
});
test("insertion preserves the rest of the draft and selection and enforces the comment limit", () => {
  const inserted = insertReference("Before selected after", item, 7, 15)!;
  assert.equal(inserted.content, `Before ${referenceText(item)} after`);
  assert.equal(inserted.content.slice(inserted.cursor), " after");
  assert.equal(insertReference("x".repeat(3999), item, 3999, 3999), undefined);
  assert.ok(insertReference("x".repeat(4000), item, 0, 4000));
});
