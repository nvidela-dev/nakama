import { test } from "node:test";
import assert from "node:assert/strict";
import { architectureViolations } from "../scripts/check-architecture";
const check = (files: Record<string, string>) =>
  architectureViolations(new Map(Object.entries(files)));
test("architecture rejects transitive browser access to server data, but permits explicit actions", () => {
  assert.ok(
    check({
      "src/features/tasks/components/list.tsx": '"use client"; import "../server/tasks";',
      "src/features/tasks/server/tasks.ts": 'import "pg";',
    }).some((x) => x.includes("browser graph reaches server")),
  );
  assert.deepEqual(
    check({
      "src/features/tasks/components/list.tsx": '"use client"; import "../actions";',
      "src/features/tasks/actions.ts": '"use server"; import "./server/tasks";',
      "src/features/tasks/server/tasks.ts": 'import "pg";',
    }),
    [],
  );
});
test("architecture catches shared UI feature coupling and deep template loading", () => {
  assert.ok(
    check({
      "src/shared/ui/example.tsx": 'import "@/features/tasks/model";',
      "src/features/tasks/model.ts": "",
    }).some((x) => x.includes("cannot import a feature")),
  );
  assert.ok(
    check({
      "src/features/projects/components/picker.tsx":
        '"use client"; import "@/features/guidance/model/flows";',
      "src/features/guidance/model/flows.ts": "",
    }).some((x) => x.includes("full flow templates")),
  );
});
test("architecture rejects primitive bypasses and runtime cycles while permitting type dependencies", () => {
  assert.ok(
    check({ "src/features/tasks/components/list.tsx": "export const List=()=> <button/>;" }).some(
      (x) => x.includes("shared UI"),
    ),
  );
  assert.ok(
    check({ "src/shared/lib/a.ts": 'import "./b";', "src/shared/lib/b.ts": 'import "./a";' }).some(
      (x) => x.includes("runtime import cycle"),
    ),
  );
  assert.deepEqual(
    check({
      "src/shared/lib/a.ts": 'import type {B} from "./b"; export type A=B;',
      "src/shared/lib/b.ts": 'import type {A} from "./a"; export type B=A;',
    }),
    [],
  );
});

test("interface icons must use the catalog while the brand wave remains custom", () => {
  assert.ok(
    check({ "src/features/tasks/components/icon.tsx": "export const Bad=()=> <svg/>;" }).some((x) =>
      x.includes("shared icon catalog"),
    ),
  );
  assert.ok(
    check({
      "src/features/tasks/components/icon.tsx": 'import { Bell } from "lucide-react";',
    }).some((x) => x.includes("shared icon catalog")),
  );
  assert.deepEqual(check({ "src/shared/ui/wave-mark.tsx": "export const Wave=()=> <svg/>;" }), []);
});

test("type-only feature cycles, presentation service bypasses and unused declarations are checked", () => {
  const graph = new Map(
    Object.entries({
      "src/features/tasks/a.ts": 'import type {X} from "@/features/projects/b";export type Y=X;',
      "src/features/projects/b.ts": 'import type {Y} from "@/features/tasks/a";export type X=Y;',
      "src/features/shell/components/view.tsx": 'import {auth} from "@clerk/nextjs/server";',
    }),
  );
  const errors = architectureViolations(graph, true);
  for (const expected of [
    "Feature dependency cycle",
    "undeclared feature dependency",
    "Unused dependency",
    "presentation must use",
  ])
    assert.ok(
      errors.some((s) => s.includes(expected)),
      expected,
    );
  assert.deepEqual(
    check({
      "src/features/tasks/components/hidden.tsx":
        'export const Hidden=()=> <input type="hidden" name="id"/>;',
    }),
    [],
  );
});
