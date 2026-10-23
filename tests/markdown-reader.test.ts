import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownReader } from "../src/shared/ui/markdown-reader";
test("Markdown reads tables and code while disabling HTML, executable links, and external image loads", () => {
  const html = renderToStaticMarkup(
    createElement(MarkdownReader, {
      content:
        "# Plan\n\n| Step | Done |\n| --- | --- |\n| One | Yes |\n\n`code`\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))\n\n![Remote image](https://example.com/pixel.png)",
    }),
  );
  assert.match(html, /<h1>Plan<\/h1>/);
  assert.match(html, /<table>/);
  assert.match(html, /<code>code<\/code>/);
  assert.doesNotMatch(html, /<script|javascript:|<img/);
  assert.match(html, /Remote image/);
});
