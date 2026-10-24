import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { architectureViolations } from "../scripts/check-architecture";
const check = (source: string, file = "src/app/globals.css") =>
  architectureViolations(new Map([[file, source]]));

test("the real Tailwind entrypoint meets the stylesheet policy", () => {
  assert.deepEqual(check(readFileSync("src/app/globals.css", "utf8")), []);
});
test("feature stylesheets and alternative CSS formats are forbidden", () => {
  for (const file of [
    "src/features/projects/styles.css",
    "src/shared/ui/button.module.css",
    "src/app/global.scss",
    "src/app/global.less",
  ])
    assert.ok(check("", file).some((error) => error.includes("only stylesheet")));
});
test("custom selectors cannot hide in nesting, escapes or allowed at-rules", () => {
  for (const source of [
    ".card { color: red; }",
    ".c\\61rd:hover { color: red; }",
    "@layer base { .card { color: red; } }",
    "@theme { .card { color: red; } }",
    "@layer base { html { & .card { color: red; } } }",
    "@layer base { [data-card] { color: red; } }",
    "@layer components { .card { @apply flex; } }",
    "@import './other.css';",
    "@utility card { display: flex; }",
    "@layer base { body { color: red; } }",
    "@layer base { html { font-size: 10px; } }",
    "@layer base { @media (prefers-reduced-motion: reduce) { * { color: red; } } }",
    ".broken {",
  ])
    assert.ok(check(source).length, source);
});
