import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { flows } from "../src/features/guidance/model/flows";
import { messages, translator, resolveLocale, formatDate } from "../src/shared/i18n/index";
import wikiMessages from "../src/features/shell/wiki-es.json";

const wikiEntries: Record<string, string> = wikiMessages;

test("every stage, question, example and persisted choice has Spanish display copy", () => {
  for (const flow of Object.values(flows)) {
    const copy = [
      flow.name,
      flow.description,
      ...flow.stages.flatMap((stage) => [
        stage.name,
        stage.question,
        ...stage.nodes.flatMap((node) => [
          node.label,
          node.question,
          node.example,
          ...(node.choices ?? []),
        ]),
      ]),
    ];
    for (const text of copy) assert.ok(messages[text], `Missing Spanish: ${text}`);
  }
});

test("UI lookup keys and service feedback have Spanish coverage", () => {
  function visitFile(file: string) {
    const raw = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true);
    const usesWikiDictionary = raw.includes("@/features/shell/wiki-i18n");
    function visit(node: ts.Node) {
      if (
        (ts.isCallExpression(node) && node.expression.getText(source) === "t") ||
        (ts.isNewExpression(node) && node.expression.getText(source) === "ProjectError")
      ) {
        const arg = node.arguments?.[0];
        if (arg && ts.isStringLiteral(arg))
          assert.ok(
            messages[arg.text] || (usesWikiDictionary && wikiEntries[arg.text]),
            `${file}: ${arg.text}`,
          );
      }
      if (
        ts.isPropertyAssignment(node) &&
        ["success", "error"].includes(node.name.getText(source)) &&
        ts.isStringLiteral(node.initializer)
      ) {
        assert.ok(messages[node.initializer.text], `Missing feedback: ${node.initializer.text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.tsx?$/.test(file)) visitFile(file);
    }
  }
  walk("src");
});

test("unsupported preferences fall back, interpolation stays literal, dates are deterministic", () => {
  assert.equal(resolveLocale("es"), "es");
  assert.equal(resolveLocale("fr"), "en");
  assert.equal(resolveLocale(), "en");
  assert.equal(translator("en")("Venture"), "Venture");
  assert.equal(translator("es")("Saved by {name}", { name: "<Alex>" }), "Guardado por <Alex>");
  assert.match(formatDate("2026-10-22T12:30:00Z", "es"), /UTC$/);
});
