import ts from "typescript";
import { isBuiltin } from "node:module";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Dependency = { specifier: string; typeOnly: boolean };
const featureDependencies: Readonly<Record<string, readonly string[]>> = {
  access: ["projects"],
  artifacts: ["access", "projects", "guidance"],
  collaboration: ["access", "projects", "guidance", "notifications"],
  guidance: ["access", "projects"],
  notifications: ["access", "projects"],
  preferences: [],
  projects: ["access", "guidance", "collaboration"],
  shell: ["access", "projects", "notifications", "preferences"],
  tasks: ["access", "projects"],
};

/** Pure checker: tests can prove rejection using synthetic modules. */
export function architectureViolations(sources: ReadonlyMap<string, string>): string[] {
  const errors = new Set<string>();
  const graph = new Map<string, string[]>();
  const clients: string[] = [];
  const trees = new Map<string, ts.SourceFile>();
  const serverActions = new Set<string>();
  function target(file: string, specifier: string) {
    const base = specifier.startsWith("@/")
      ? `src/${specifier.slice(2)}`
      : specifier.startsWith(".")
        ? normalize(join(dirname(file), specifier))
        : undefined;
    return (
      base &&
      [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, `${base}/index.ts`].find((candidate) =>
        sources.has(candidate),
      )
    );
  }
  for (const [file, source] of sources) {
    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
    const tree = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    trees.set(file, tree);
    const directive = tree.statements[0];
    const mode =
      directive && ts.isExpressionStatement(directive) && ts.isStringLiteral(directive.expression)
        ? directive.expression.text
        : undefined;
    if (mode === "use client" || file.endsWith(".stories.tsx")) clients.push(file);
    if (mode === "use server") {
      serverActions.add(file);
      if (!file.startsWith("src/features/"))
        errors.add(`${file}: actions belong to their owning feature`);
    }
    if (
      !/^src\/(?:app|features|shared|server)\//.test(file) &&
      !["src/proxy.ts", "src/instrumentation.ts"].includes(file)
    )
      errors.add(`${file}: unsupported source location`);
    const dependencies: Dependency[] = [];
    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = node.importClause;
        const named = clause?.namedBindings;
        const typeOnly =
          !!clause?.isTypeOnly ||
          !!(
            clause &&
            !clause.name &&
            named &&
            ts.isNamedImports(named) &&
            named.elements.length &&
            named.elements.every((element) => element.isTypeOnly)
          );
        dependencies.push({ specifier: node.moduleSpecifier.text, typeOnly });
      } else if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        dependencies.push({ specifier: node.moduleSpecifier.text, typeOnly: node.isTypeOnly });
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        dependencies.push({ specifier: node.arguments[0].text, typeOnly: false });
      }
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        !file.startsWith("src/shared/ui/") &&
        ["button", "input", "select", "textarea", "dialog"].includes(node.tagName.getText(tree))
      )
        errors.add(`${file}: use the shared UI ${node.tagName.getText(tree)} primitive`);
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.tagName.getText(tree) === "svg" &&
        file !== "src/shared/ui/wave-mark.tsx"
      )
        errors.add(`${file}: use the shared icon catalog instead of drawing interface SVGs`);
      ts.forEachChild(node, visit);
    }
    visit(tree);
    const edges: string[] = [];
    for (const dependency of dependencies) {
      if (dependency.specifier.startsWith("lucide-react") && file !== "src/shared/ui/icon.tsx")
        errors.add(`${file}: choose icons through the shared icon catalog`);
      const dest = target(file, dependency.specifier);
      if (/^(?:@\/)?(?:lib|components)\//.test(dependency.specifier))
        errors.add(`${file}: legacy folder import ${dependency.specifier}`);
      if (
        (file.startsWith("src/shared/") || file.startsWith("src/server/")) &&
        dest?.startsWith("src/features/")
      )
        errors.add(`${file}: infrastructure/shared code cannot import a feature`);
      if (file.startsWith("src/shared/") && dest?.startsWith("src/server/"))
        errors.add(`${file}: shared code cannot import server infrastructure`);
      if (!file.startsWith("src/app/") && dest?.startsWith("src/app/"))
        errors.add(`${file}: app is a composition layer and cannot be imported`);
      const owner = file.match(/^src\/features\/([^/]+)/)?.[1];
      const other = dest?.match(/^src\/features\/([^/]+)/)?.[1];
      if (owner && !featureDependencies[owner])
        errors.add(`${file}: feature is missing from the explicit dependency policy`);
      if (
        !dependency.typeOnly &&
        owner &&
        other &&
        owner !== other &&
        !featureDependencies[owner]?.includes(other)
      )
        errors.add(`${file}: undeclared feature dependency on ${other}`);
      if (
        file.startsWith("src/shared/ui/") &&
        /^(?:next(?:\/|$)|@clerk\/|pg$|server-only$|node:)/.test(dependency.specifier)
      )
        errors.add(`${file}: UI must be independent of framework services`);
      if (
        dependency.typeOnly &&
        /^src\/features\/[^/]+\/components\//.test(file) &&
        dest?.includes("/server/")
      )
        errors.add(
          `${file}: presentation contracts belong in the feature model, not server modules`,
        );
      if (!dependency.typeOnly) edges.push(dest ?? dependency.specifier);
    }
    graph.set(file, edges);
  }
  for (const client of clients) {
    const seen = new Set<string>();
    function walk(file: string) {
      if (seen.has(file)) return;
      seen.add(file);
      if (serverActions.has(file)) {
        if (client.endsWith(".stories.tsx"))
          errors.add(`${client}: stories cannot load real Server Actions; use a pure presentation`);
        return; // Next compiles explicit actions into RPC references.
      }
      if (
        isBuiltin(file) ||
        /\/server\/|^node:|^pg$|^server-only$|^next\/(?:headers|cache)$|^@clerk\/nextjs\/server$/.test(
          file,
        ) ||
        file.endsWith("/shared/i18n/server.ts")
      )
        errors.add(`${client}: browser graph reaches server module ${file}`);
      if (file.endsWith("/guidance/model/flows.ts"))
        errors.add(`${client}: browser graph loads full flow templates; use the generated catalog`);
      for (const edge of graph.get(file) ?? []) walk(edge);
    }
    walk(client);
  }
  const visited = new Set<string>(),
    active = new Set<string>();
  function cycle(file: string) {
    if (active.has(file)) {
      errors.add(`${file}: runtime import cycle`);
      return;
    }
    if (visited.has(file)) return;
    visited.add(file);
    active.add(file);
    for (const edge of graph.get(file) ?? []) if (trees.has(edge)) cycle(edge);
    active.delete(file);
  }
  for (const file of graph.keys()) cycle(file);
  return [...errors].sort();
}
async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? sourceFiles(join(directory, entry.name))
          : Promise.resolve([join(directory, entry.name)]),
      ),
    )
  ).flat();
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await sourceFiles("src");
  const sources = new Map(
    await Promise.all(
      files
        .filter((file) => /\.(ts|tsx|json)$/.test(file))
        .map(async (file) => [file, await readFile(file, "utf8")] as const),
    ),
  );
  const errors = architectureViolations(sources);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      `Architecture verified: ${sources.size} source files; feature dependencies, shared UI, client/server graphs and runtime cycles checked.`,
    );
}
