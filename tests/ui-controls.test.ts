import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Input, Textarea, Select } from "../src/shared/ui/controls";
test("server-rendered controlled fields wait for handlers without disabling native hidden/uncontrolled form data", () => {
  assert.match(
    renderToStaticMarkup(createElement(Input, { value: "Draft", onChange: () => {} })),
    /disabled/,
  );
  assert.match(
    renderToStaticMarkup(createElement(Textarea, { value: "Draft", onChange: () => {} })),
    /disabled/,
  );
  assert.match(
    renderToStaticMarkup(createElement(Select, { value: "ready", onChange: () => {} })),
    /disabled/,
  );
  assert.doesNotMatch(
    renderToStaticMarkup(
      createElement(Input, { type: "hidden", name: "projectId", value: "fixture" }),
    ),
    /disabled/,
  );
  assert.doesNotMatch(
    renderToStaticMarkup(createElement(Input, { name: "title", defaultValue: "Draft" })),
    /disabled/,
  );
});
