import { chromium, type Page, type Response } from "@playwright/test";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { appendFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import ts from "typescript";
import { z } from "zod";

export const chunkMetricSchema = z.object({
  path: z.string(),
  bytes: z.number().int().nonnegative(),
  gzip: z.number().int().nonnegative(),
  category: z.enum(["framework", "layout", "route", "lazy", "polyfill", "css"]).optional(),
  tags: z.array(z.string()).optional(),
});

export const longTaskSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  totalMs: z.number().nonnegative(),
  maxMs: z.number().nonnegative(),
});

export const cdpMetricsSchema = z.object({
  scriptDurationMs: z.number().nonnegative(),
  taskDurationMs: z.number().nonnegative(),
  layoutCount: z.number().int().nonnegative(),
  layoutDurationMs: z.number().nonnegative(),
  recalcStyleCount: z.number().int().nonnegative(),
  recalcStyleDurationMs: z.number().nonnegative(),
  jsHeapUsedBytes: z.number().int().nonnegative(),
});

export const frontendRouteMetricSchema = z.object({
  route: z.string(),
  width: z.number().int().positive(),
  overflow: z.boolean(),
  scripts: z.number().int().nonnegative(),
  jsBytes: z.number().int().nonnegative(),
  jsGzip: z.number().int().nonnegative(),
  navigationMs: z.number().nonnegative(),
  cssFiles: z.number().int().nonnegative().optional(),
  cssBytes: z.number().int().nonnegative().optional(),
  cssGzip: z.number().int().nonnegative().optional(),
  documentBytes: z.number().int().nonnegative().optional(),
  documentGzip: z.number().int().nonnegative().optional(),
  ttfbMs: z.number().nonnegative().optional(),
  domInteractiveMs: z.number().nonnegative().optional(),
  domCompleteMs: z.number().nonnegative().optional(),
  fcpMs: z.number().nonnegative().nullable().optional(),
  lcpMs: z.number().nonnegative().nullable().optional(),
  cls: z.number().nonnegative().optional(),
  domNodes: z.number().int().nonnegative().optional(),
  maxDomDepth: z.number().int().nonnegative().optional(),
  longTasks: longTaskSummarySchema.optional(),
  cdp: cdpMetricsSchema.optional(),
  chunks: z.array(chunkMetricSchema).optional(),
});

export const previewInteractionMetricSchema = z.object({
  width: z.number().int().positive(),
  stageSwitchMs: z.number().nonnegative(),
  stageSwitchOverflow: z.boolean(),
  nodeSelectMs: z.number().nonnegative(),
  nodeSelectOverflow: z.boolean(),
  mapOpenMs: z.number().nonnegative(),
  mapCloseMs: z.number().nonnegative(),
  mapFocusRestored: z.boolean(),
  mapOverflow: z.boolean(),
  mapLazyScripts: z.number().int().nonnegative(),
  mapLazyJsBytes: z.number().int().nonnegative(),
  mapLazyJsGzip: z.number().int().nonnegative(),
  mapLazyChunks: z.array(chunkMetricSchema),
});

export const staticRouteBundleSchema = z.object({
  route: z.string(),
  scripts: z.number().int().nonnegative(),
  jsBytes: z.number().int().nonnegative(),
  jsGzip: z.number().int().nonnegative(),
  routeOnlyScripts: z.number().int().nonnegative(),
  routeOnlyJsBytes: z.number().int().nonnegative(),
  routeOnlyJsGzip: z.number().int().nonnegative(),
  cssFiles: z.number().int().nonnegative(),
  cssBytes: z.number().int().nonnegative(),
  cssGzip: z.number().int().nonnegative(),
  clientBoundaries: z.array(z.string()),
  notableTags: z.array(z.string()),
});

export const staticBuildAnalysisSchema = z.object({
  buildId: z.string(),
  frameworkRuntimeJsBytes: z.number().int().nonnegative(),
  frameworkRuntimeJsGzip: z.number().int().nonnegative(),
  rootLayoutShellJsBytes: z.number().int().nonnegative(),
  rootLayoutShellJsGzip: z.number().int().nonnegative(),
  sharedBaselineJsBytes: z.number().int().nonnegative(),
  sharedBaselineJsGzip: z.number().int().nonnegative(),
  polyfillJsBytes: z.number().int().nonnegative(),
  polyfillJsGzip: z.number().int().nonnegative(),
  sharedCssBytes: z.number().int().nonnegative(),
  sharedCssGzip: z.number().int().nonnegative(),
  routes: z.array(staticRouteBundleSchema),
  lazyChunks: z.array(chunkMetricSchema),
});

export const clientImportHotspotSchema = z.object({
  id: z.string(),
  target: z.string(),
  severity: z.enum(["opportunity", "info"]),
  clientEntrypoints: z.array(z.string()),
  sampleChain: z.array(z.string()),
  recommendation: z.string(),
});

export const dynamicBoundarySchema = z.object({
  file: z.string(),
  target: z.string(),
  ssrFalse: z.boolean(),
});

export const clientGraphAnalysisSchema = z.object({
  clientEntrypointCount: z.number().int().nonnegative(),
  dynamicBoundaries: z.array(dynamicBoundarySchema),
  hotspots: z.array(clientImportHotspotSchema),
});

export const budgetCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.enum(["bytes", "score", "count", "boolean"]),
  actual: z.number(),
  limit: z.number(),
  warn: z.number().optional(),
  status: z.enum(["pass", "warn", "fail"]),
});

export const metricDeltaSchema = z.object({
  metric: z.string(),
  before: z.number(),
  after: z.number(),
  delta: z.number(),
  percentChange: z.number().nullable(),
});

export const frontendReportSchema = z.object({
  schemaVersion: z.literal(1),
  measuredAt: z.string(),
  gitCommit: z.string().nullable(),
  gitBranch: z.string().nullable(),
  staticBuild: staticBuildAnalysisSchema.nullable(),
  clientGraph: clientGraphAnalysisSchema,
  browserRoutes: z.array(frontendRouteMetricSchema),
  interactions: z.array(previewInteractionMetricSchema),
  budgets: z.array(budgetCheckSchema),
  deltas: z.array(metricDeltaSchema),
});

export type ChunkMetric = z.infer<typeof chunkMetricSchema>;
export type FrontendRouteMetric = z.infer<typeof frontendRouteMetricSchema>;
export type PreviewInteractionMetric = z.infer<typeof previewInteractionMetricSchema>;
export type StaticRouteBundle = z.infer<typeof staticRouteBundleSchema>;
export type StaticBuildAnalysis = z.infer<typeof staticBuildAnalysisSchema>;
export type ClientImportHotspot = z.infer<typeof clientImportHotspotSchema>;
export type DynamicBoundary = z.infer<typeof dynamicBoundarySchema>;
export type ClientGraphAnalysis = z.infer<typeof clientGraphAnalysisSchema>;
export type BudgetCheck = z.infer<typeof budgetCheckSchema>;
export type MetricDelta = z.infer<typeof metricDeltaSchema>;
export type FrontendReport = z.infer<typeof frontendReportSchema>;

export const frontendBudgets = {
  previewInitialJsGzip: 220_000,
  previewInitialJsGzipWarn: 205_000,
  landingInitialJsGzip: 205_000,
  maxRouteInitialJsGzip: 290_000,
  maxRouteInitialJsGzipWarn: 220_000,
  initialCssGzip: 20_000,
  mapLazyJsGzip: 155_000,
  maxCls: 0.05,
  maxPreviewDomNodes: 1_500,
} as const;

const nextBuildManifestSchema = z.object({
  polyfillFiles: z.array(z.string()).default([]),
  rootMainFiles: z.array(z.string()).default([]),
});

const clientReferenceManifestEntrySchema = z.object({
  clientModules: z.record(z.string(), z.unknown()).default({}),
  entryJSFiles: z.record(z.string(), z.array(z.string())).default({}),
  entryCSSFiles: z
    .record(
      z.string(),
      z.array(
        z.union([
          z.string(),
          z.object({
            path: z.string(),
            inlined: z.boolean().optional(),
          }),
        ]),
      ),
    )
    .default({}),
});

const legacyBaselineSchema = z.union([
  frontendReportSchema,
  z.array(frontendRouteMetricSchema),
  frontendRouteMetricSchema.extend({ navigationMs: z.number().nonnegative().optional() }),
]);

/** Recognizes library signatures inside compiled static chunks without exposing sensitive data. */
export function classifyChunkContent(content: string, filename: string): string[] {
  const tags = new Set<string>();
  if (filename.startsWith("turbopack-")) tags.add("turbopack-runtime");
  if (/WebGLRenderer|PerspectiveCamera|THREE/.test(content)) tags.add("three-3d");
  if (/remarkGfm|react-markdown|mdast|micromark/.test(content)) tags.add("react-markdown");
  if (/ZodError|safeParseAsync|\$zod/.test(content)) tags.add("zod");
  if (content.includes("EJEMPLO DE SOLO LECTURA") || content.includes("Crear enlace de invitación"))
    tags.add("es-dictionary");
  if (content.includes("Show 3D mini-view") && content.includes("READ-ONLY EXAMPLE"))
    tags.add("journey-ui");
  if (content.includes('["AnswerEditor"')) tags.add("answer-editor");
  if (content.includes('["StageReviewForm"')) tags.add("stage-review-form");
  if (/ClerkProvider|@clerk|__clerk/.test(content)) tags.add("clerk");
  if (/lucide|createLucideIcon/.test(content)) tags.add("lucide-react");
  if (/react-dom|__REACT_DEVTOOLS_GLOBAL_HOOK__/.test(content)) tags.add("react-dom");
  if (/spark-name|flowCatalog|stageOrder/.test(content)) tags.add("flow-catalog");
  return [...tags].sort();
}

async function findFiles(
  directory: string,
  predicate: (path: string) => boolean,
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  return (
    await Promise.all(
      entries.map((entry) => {
        const full = join(directory, entry.name);
        return entry.isDirectory()
          ? findFiles(full, predicate)
          : Promise.resolve(predicate(full) ? [full] : []);
      }),
    )
  ).flat();
}

function normalizeChunkKey(chunkPath: string): string {
  return chunkPath.replace(/^\/?_next\//, "");
}

/** Static analyzer for Next.js production build output across all App Router pages. */
export async function analyzeBuildBundle(nextDir = ".next"): Promise<StaticBuildAnalysis | null> {
  const buildManifestRaw = await readFile(join(nextDir, "build-manifest.json"), "utf8").catch(
    () => null,
  );
  if (!buildManifestRaw) return null;
  const buildId = (await readFile(join(nextDir, "BUILD_ID"), "utf8").catch(() => "unknown")).trim();
  const buildManifest = nextBuildManifestSchema.parse(JSON.parse(buildManifestRaw));

  const chunkDir = join(nextDir, "static", "chunks");
  const chunkFiles = await findFiles(
    chunkDir,
    (file) => file.endsWith(".js") || file.endsWith(".css"),
  );
  const chunkMap = new Map<string, ChunkMetric>();
  for (const fullPath of chunkFiles) {
    const body = await readFile(fullPath);
    const filename = fullPath.slice(chunkDir.length + 1);
    const key = `static/chunks/${filename}`;
    const tags = filename.endsWith(".js")
      ? classifyChunkContent(body.toString("utf8"), filename)
      : [];
    chunkMap.set(key, {
      path: `/_next/${key}`,
      bytes: body.length,
      gzip: gzipSync(body).length,
      category: filename.endsWith(".css") ? "css" : "lazy",
      tags,
    });
  }

  const rootMainSet = new Set(buildManifest.rootMainFiles.map(normalizeChunkKey));
  const polyfillSet = new Set(buildManifest.polyfillFiles.map(normalizeChunkKey));
  for (const key of rootMainSet) {
    const metric = chunkMap.get(key);
    if (metric) metric.category = "framework";
  }
  for (const key of polyfillSet) {
    const metric = chunkMap.get(key);
    if (metric) metric.category = "polyfill";
  }

  const manifestFiles = await findFiles(join(nextDir, "server", "app"), (file) =>
    file.endsWith("page_client-reference-manifest.js"),
  );

  const layoutSet = new Set<string>();
  const parsedRouteManifests: Array<{
    route: string;
    manifest: z.infer<typeof clientReferenceManifestEntrySchema>;
  }> = [];

  for (const file of manifestFiles) {
    const text = await readFile(file, "utf8");
    const match = text.match(/globalThis\.__RSC_MANIFEST\["([^"]+)"\]\s*=\s*(\{[\s\S]*\});\s*$/);
    if (!match?.[1] || !match[2]) continue;
    const rawRouteKey = match[1];
    if (rawRouteKey.startsWith("/_")) continue;
    const route = rawRouteKey === "/page" ? "/" : rawRouteKey.replace(/\/page$/, "");
    const manifest = clientReferenceManifestEntrySchema.parse(JSON.parse(match[2]));
    for (const [entryKey, files] of Object.entries(manifest.entryJSFiles)) {
      if (entryKey.endsWith("/app/layout") || entryKey.endsWith("/app/error")) {
        for (const chunk of files) layoutSet.add(normalizeChunkKey(chunk));
      }
    }
    parsedRouteManifests.push({ route, manifest });
  }

  for (const key of layoutSet) {
    const metric = chunkMap.get(key);
    if (metric && metric.category === "lazy") metric.category = "layout";
  }

  const sharedBaselineKeys = new Set<string>([...rootMainSet, ...layoutSet]);
  const sumChunks = (keys: Iterable<string>) => {
    let bytes = 0;
    let gzip = 0;
    let count = 0;
    for (const key of keys) {
      const item = chunkMap.get(key);
      if (!item) continue;
      bytes += item.bytes;
      gzip += item.gzip;
      count += 1;
    }
    return { count, bytes, gzip };
  };

  const frameworkTotals = sumChunks(rootMainSet);
  const layoutTotals = sumChunks(layoutSet);
  const sharedTotals = sumChunks(sharedBaselineKeys);
  const polyfillTotals = sumChunks(polyfillSet);

  const routes: StaticRouteBundle[] = [];
  for (const { route, manifest } of parsedRouteManifests) {
    const jsKeys = new Set<string>(sharedBaselineKeys);
    const routeOnlyKeys = new Set<string>();
    for (const [entryKey, files] of Object.entries(manifest.entryJSFiles)) {
      if (entryKey.endsWith("/not-found") || entryKey.endsWith("/global-error")) continue;
      for (const file of files) {
        const normalized = normalizeChunkKey(file);
        jsKeys.add(normalized);
        if (!sharedBaselineKeys.has(normalized) && !polyfillSet.has(normalized)) {
          routeOnlyKeys.add(normalized);
          const item = chunkMap.get(normalized);
          if (item && item.category === "lazy") item.category = "route";
        }
      }
    }

    const cssKeys = new Set<string>();
    for (const files of Object.values(manifest.entryCSSFiles)) {
      for (const entry of files) {
        const rawPath = typeof entry === "string" ? entry : entry.path;
        cssKeys.add(normalizeChunkKey(rawPath));
      }
    }

    const jsTotals = sumChunks(jsKeys);
    const routeOnlyTotals = sumChunks(routeOnlyKeys);
    const cssTotals = sumChunks(cssKeys);

    const clientBoundaries = Object.keys(manifest.clientModules)
      .filter((mod) => mod.startsWith("[project]/src/"))
      .map((mod) => mod.replace(/^\[project\]\//, ""))
      .filter((mod) => mod !== "src/app/error.tsx")
      .sort();

    const notableTags = new Set<string>();
    for (const key of routeOnlyKeys) {
      for (const tag of chunkMap.get(key)?.tags ?? []) notableTags.add(tag);
    }

    routes.push({
      route,
      scripts: jsTotals.count,
      jsBytes: jsTotals.bytes,
      jsGzip: jsTotals.gzip,
      routeOnlyScripts: routeOnlyTotals.count,
      routeOnlyJsBytes: routeOnlyTotals.bytes,
      routeOnlyJsGzip: routeOnlyTotals.gzip,
      cssFiles: cssTotals.count,
      cssBytes: cssTotals.bytes,
      cssGzip: cssTotals.gzip,
      clientBoundaries,
      notableTags: [...notableTags].sort(),
    });
  }

  routes.sort((a, b) => b.jsGzip - a.jsGzip || a.route.localeCompare(b.route));

  const cssChunks = [...chunkMap.values()].filter((chunk) => chunk.category === "css");
  const lazyChunks = [...chunkMap.values()]
    .filter((chunk) => chunk.category === "lazy")
    .sort((a, b) => b.gzip - a.gzip);

  return {
    buildId,
    frameworkRuntimeJsBytes: frameworkTotals.bytes,
    frameworkRuntimeJsGzip: frameworkTotals.gzip,
    rootLayoutShellJsBytes: layoutTotals.bytes,
    rootLayoutShellJsGzip: layoutTotals.gzip,
    sharedBaselineJsBytes: sharedTotals.bytes,
    sharedBaselineJsGzip: sharedTotals.gzip,
    polyfillJsBytes: polyfillTotals.bytes,
    polyfillJsGzip: polyfillTotals.gzip,
    sharedCssBytes: cssChunks.reduce((sum, item) => sum + item.bytes, 0),
    sharedCssGzip: cssChunks.reduce((sum, item) => sum + item.gzip, 0),
    routes,
    lazyChunks,
  };
}

/** Pure AST analyzer that detects heavy static client imports and verifies lazy dynamic boundaries. */
export function analyzeClientImportHotspots(
  sources: ReadonlyMap<string, string>,
): ClientGraphAnalysis {
  const staticGraph = new Map<string, string[]>();
  const clientEntrypoints: string[] = [];
  const dynamicBoundaries: DynamicBoundary[] = [];

  function resolveModule(fromFile: string, specifier: string): string {
    const base = specifier.startsWith("@/")
      ? `src/${specifier.slice(2)}`
      : specifier.startsWith(".")
        ? normalize(join(dirname(fromFile), specifier))
        : undefined;
    if (!base) return specifier;
    return (
      [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, `${base}/index.ts`].find((candidate) =>
        sources.has(candidate),
      ) ?? base
    );
  }

  for (const [file, source] of sources) {
    if ((!file.endsWith(".ts") && !file.endsWith(".tsx")) || file.endsWith(".stories.tsx"))
      continue;
    const tree = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const first = tree.statements[0];
    const directive =
      first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression)
        ? first.expression.text
        : undefined;
    if (directive === "use client") clientEntrypoints.push(file);

    const edges: string[] = [];
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
            named.elements.length > 0 &&
            named.elements.every((el) => el.isTypeOnly)
          );
        if (!typeOnly) edges.push(resolveModule(file, node.moduleSpecifier.text));
      } else if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        !node.isTypeOnly
      ) {
        edges.push(resolveModule(file, node.moduleSpecifier.text));
      } else if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "dynamic"
      ) {
        const ssrFalse = node.arguments.some(
          (arg) => ts.isObjectLiteralExpression(arg) && /ssr\s*:\s*false/.test(arg.getText(tree)),
        );
        const importMatch = node.getText(tree).match(/import\(\s*["']([^"']+)["']\s*\)/);
        if (importMatch?.[1]) {
          dynamicBoundaries.push({
            file,
            target: resolveModule(file, importMatch[1]),
            ssrFalse,
          });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
    staticGraph.set(file, edges);
  }

  function findShortestChain(start: string, predicate: (node: string) => boolean): string[] | null {
    const queue: string[][] = [[start]];
    const seen = new Set<string>([start]);
    while (queue.length > 0) {
      const path = queue.shift();
      if (!path) break;
      const last = path[path.length - 1];
      if (!last) continue;
      if (path.length > 1 && predicate(last)) return path;
      for (const next of staticGraph.get(last) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push([...path, next]);
      }
    }
    return null;
  }

  const rules: Array<{
    id: string;
    target: string;
    severity: "opportunity" | "info";
    predicate: (node: string) => boolean;
    ignoreEntrypoint?: (entry: string) => boolean;
    recommendation: string;
  }> = [
    {
      id: "client-es-dictionary",
      target: "src/shared/i18n/es.json",
      severity: "opportunity",
      predicate: (node) => node === "src/shared/i18n/es.json",
      recommendation:
        "Split formatDate/locale helpers from static dictionary catalogs so client components do not bundle inactive locale JSON (~26 KB gzip).",
    },
    {
      id: "client-zod-runtime",
      target: "zod",
      severity: "opportunity",
      predicate: (node) => node === "zod",
      recommendation:
        "Dynamically import client-side file parsers (such as parseLockInFile) on user interaction so Zod (~40 KB gzip) stays out of initial route hydration.",
    },
    {
      id: "client-three-direct",
      target: "three",
      severity: "opportunity",
      predicate: (node) => node === "three" || node.startsWith("three/"),
      ignoreEntrypoint: (entry) => entry.endsWith("/journey-miniview.tsx"),
      recommendation:
        "Keep Three.js isolated behind next/dynamic in journey-miniview.tsx so 3D rendering (~136 KB gzip) loads only on demand.",
    },
    {
      id: "client-markdown-direct",
      target: "react-markdown",
      severity: "opportunity",
      predicate: (node) => node === "react-markdown" || node === "remark-gfm",
      ignoreEntrypoint: (entry) => entry.endsWith("/markdown-reader.tsx"),
      recommendation:
        "Keep react-markdown and remark-gfm isolated behind next/dynamic in markdown-reader.tsx (~43 KB gzip).",
    },
  ];

  const hotspots: ClientImportHotspot[] = [];
  for (const rule of rules) {
    const matchedEntries: string[] = [];
    let bestChain: string[] | null = null;
    for (const entry of clientEntrypoints.sort()) {
      if (rule.ignoreEntrypoint?.(entry)) continue;
      const chain = findShortestChain(entry, rule.predicate);
      if (chain) {
        matchedEntries.push(entry);
        if (!bestChain || chain.length < bestChain.length) bestChain = chain;
      }
    }
    if (matchedEntries.length > 0 && bestChain) {
      hotspots.push({
        id: rule.id,
        target: rule.target,
        severity: rule.severity,
        clientEntrypoints: matchedEntries,
        sampleChain: bestChain,
        recommendation: rule.recommendation,
      });
    }
  }

  return {
    clientEntrypointCount: clientEntrypoints.length,
    dynamicBoundaries: dynamicBoundaries.sort((a, b) => a.file.localeCompare(b.file)),
    hotspots,
  };
}

export async function loadSourceMap(directory = "src"): Promise<Map<string, string>> {
  const files = await findFiles(directory, (file) => /\.(ts|tsx|json)$/.test(file));
  return new Map(
    await Promise.all(files.map(async (file) => [file, await readFile(file, "utf8")] as const)),
  );
}

declare global {
  interface Window {
    __nakamaPerf?: {
      lcpMs: number | null;
      cls: number;
      longTasks: { count: number; totalMs: number; maxMs: number };
    };
  }
}

async function installPerfObservers(page: Page) {
  await page.addInitScript(() => {
    window.__nakamaPerf = {
      lcpMs: null,
      cls: 0,
      longTasks: { count: 0, totalMs: 0, maxMs: 0 },
    };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) window.__nakamaPerf!.lcpMs = Math.round(last.startTime * 100) / 100;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<
          PerformanceEntry & { hadRecentInput?: boolean; value?: number }
        >) {
          if (!entry.hadRecentInput && typeof entry.value === "number") {
            window.__nakamaPerf!.cls =
              Math.round((window.__nakamaPerf!.cls + entry.value) * 10_000) / 10_000;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const stats = window.__nakamaPerf!.longTasks;
          stats.count += 1;
          stats.totalMs = Math.round((stats.totalMs + entry.duration) * 100) / 100;
          if (entry.duration > stats.maxMs) {
            stats.maxMs = Math.round(entry.duration * 100) / 100;
          }
        }
      }).observe({ type: "longtask", buffered: true });
    } catch {}
  });
}

/** Only public synthetic routes (/preview, /) are measured; no project/authentication fixtures. */
export async function measureFrontend(
  page: Page,
  baseURL: string,
  routePath = "/preview",
): Promise<FrontendRouteMetric> {
  const origin = new URL(baseURL).origin;
  if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
    throw new Error("Measure a local production build.");

  await installPerfObservers(page);

  const cdpSession = await page
    .context()
    .newCDPSession(page)
    .catch(() => null);
  if (cdpSession) {
    await cdpSession.send("Performance.enable").catch(() => {});
  }

  const scripts = new Map<string, { bytes: number; gzip: number }>();
  const styles = new Map<string, { bytes: number; gzip: number }>();
  let documentBytes = 0;
  let documentGzip = 0;
  const pending: Promise<void>[] = [];

  const collect = (response: Response) => {
    const url = new URL(response.url());
    if (url.origin !== origin) return;
    const resourceType = response.request().resourceType();
    if (url.pathname.endsWith(".js")) {
      pending.push(
        response
          .body()
          .then((body) => {
            scripts.set(url.pathname, { bytes: body.length, gzip: gzipSync(body).length });
          })
          .catch(() => {}),
      );
    } else if (url.pathname.endsWith(".css")) {
      pending.push(
        response
          .body()
          .then((body) => {
            styles.set(url.pathname, { bytes: body.length, gzip: gzipSync(body).length });
          })
          .catch(() => {}),
      );
    } else if (resourceType === "document" && url.pathname === routePath) {
      pending.push(
        response
          .body()
          .then((body) => {
            documentBytes = body.length;
            documentGzip = gzipSync(body).length;
          })
          .catch(() => {}),
      );
    }
  };

  page.on("response", collect);
  const started = Date.now();
  await page.goto(`${origin}${routePath}`, { waitUntil: "load" });
  if (routePath === "/preview") {
    await page.getByRole("button", { name: "Show 3D mini-view" }).waitFor();
  } else {
    await page.locator("main").first().waitFor();
  }
  const navigationMs = Date.now() - started;

  await page.evaluate(
    () =>
      new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
      }),
  );
  await Promise.all(pending);
  page.off("response", collect);

  const browserStats = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    let domNodes = 0;
    let maxDomDepth = 0;
    const stack: Array<{ el: Element; depth: number }> = document.documentElement
      ? [{ el: document.documentElement, depth: 1 }]
      : [];
    while (stack.length > 0) {
      const current = stack.pop()!;
      domNodes += 1;
      if (current.depth > maxDomDepth) maxDomDepth = current.depth;
      for (const child of current.el.children) {
        stack.push({ el: child, depth: current.depth + 1 });
      }
    }
    const ttfbRaw = nav ? nav.responseStart - nav.requestStart : 0;
    const domInteractiveRaw = nav?.domInteractive ?? 0;
    const domCompleteRaw = nav?.domComplete ?? 0;
    return {
      width: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
      ttfbMs: ttfbRaw > 0 ? Math.round(ttfbRaw * 100) / 100 : 0,
      domInteractiveMs: domInteractiveRaw > 0 ? Math.round(domInteractiveRaw * 100) / 100 : 0,
      domCompleteMs: domCompleteRaw > 0 ? Math.round(domCompleteRaw * 100) / 100 : 0,
      fcpMs: fcp ? Math.round(fcp.startTime * 100) / 100 : null,
      lcpMs: window.__nakamaPerf?.lcpMs ?? null,
      cls: window.__nakamaPerf?.cls ?? 0,
      longTasks: window.__nakamaPerf?.longTasks ?? { count: 0, totalMs: 0, maxMs: 0 },
      domNodes,
      maxDomDepth,
    };
  });

  let cdp: z.infer<typeof cdpMetricsSchema> | undefined;
  if (cdpSession) {
    const rawMetrics = await cdpSession
      .send("Performance.getMetrics")
      .then((res) => new Map(res.metrics.map((m) => [m.name, m.value])))
      .catch(() => null);
    await cdpSession.detach().catch(() => {});
    if (rawMetrics) {
      const ms = (key: string) => Math.round((rawMetrics.get(key) ?? 0) * 1000 * 100) / 100;
      cdp = {
        scriptDurationMs: ms("ScriptDuration"),
        taskDurationMs: ms("TaskDuration"),
        layoutCount: Math.round(rawMetrics.get("LayoutCount") ?? 0),
        layoutDurationMs: ms("LayoutDuration"),
        recalcStyleCount: Math.round(rawMetrics.get("RecalcStyleCount") ?? 0),
        recalcStyleDurationMs: ms("RecalcStyleDuration"),
        jsHeapUsedBytes: Math.round(rawMetrics.get("JSHeapUsedSize") ?? 0),
      };
    }
  }

  const chunkList: ChunkMetric[] = [...scripts.entries()]
    .map(([path, size]) => ({ path, bytes: size.bytes, gzip: size.gzip }))
    .sort((a, b) => b.gzip - a.gzip);

  return {
    route: routePath,
    width: browserStats.width,
    overflow: browserStats.overflow,
    scripts: scripts.size,
    jsBytes: chunkList.reduce((sum, item) => sum + item.bytes, 0),
    jsGzip: chunkList.reduce((sum, item) => sum + item.gzip, 0),
    navigationMs,
    cssFiles: styles.size,
    cssBytes: [...styles.values()].reduce((sum, item) => sum + item.bytes, 0),
    cssGzip: [...styles.values()].reduce((sum, item) => sum + item.gzip, 0),
    documentBytes,
    documentGzip,
    ttfbMs: browserStats.ttfbMs,
    domInteractiveMs: browserStats.domInteractiveMs,
    domCompleteMs: browserStats.domCompleteMs,
    fcpMs: browserStats.fcpMs,
    lcpMs: browserStats.lcpMs,
    cls: browserStats.cls,
    domNodes: browserStats.domNodes,
    maxDomDepth: browserStats.maxDomDepth,
    longTasks: browserStats.longTasks,
    ...(cdp ? { cdp } : {}),
    chunks: chunkList,
  };
}

/** Measures interactive stage/node transitions and on-demand 3D mini-view lazy chunk loading on /preview. */
export async function measurePreviewInteractions(
  page: Page,
  baseURL: string,
): Promise<PreviewInteractionMetric> {
  const origin = new URL(baseURL).origin;
  if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
    throw new Error("Measure a local production build.");

  await page.goto(`${origin}/preview`, { waitUntil: "load" });
  const trigger = page.getByRole("button", { name: "Show 3D mini-view" });
  await trigger.waitFor();

  const stageStarted = Date.now();
  await page.locator('a[href="/preview?stage=spark"]').first().click();
  await page.waitForURL((url) => url.searchParams.get("stage") === "spark");
  const stageSwitchMs = Date.now() - stageStarted;
  const stageSwitchOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );

  const nodeStarted = Date.now();
  await page.locator('a[href="/preview?stage=spark&node=spark-name"]').first().click();
  await page.waitForURL((url) => url.searchParams.get("node") === "spark-name");
  const nodeSelectMs = Date.now() - nodeStarted;
  const nodeSelectOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );

  const lazyScripts = new Map<string, { bytes: number; gzip: number }>();
  const pending: Promise<void>[] = [];
  const collectLazy = (response: Response) => {
    const url = new URL(response.url());
    if (url.origin !== origin || !url.pathname.endsWith(".js")) return;
    pending.push(
      response
        .body()
        .then((body) => {
          lazyScripts.set(url.pathname, { bytes: body.length, gzip: gzipSync(body).length });
        })
        .catch(() => {}),
    );
  };

  page.on("response", collectLazy);
  const mapOpenStarted = Date.now();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "3D stage map" });
  await dialog.waitFor({ state: "visible" });
  await dialog.locator("canvas").waitFor({ state: "visible" });
  const mapOpenMs = Date.now() - mapOpenStarted;
  await Promise.all(pending);
  page.off("response", collectLazy);

  const mapOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

  const mapCloseStarted = Date.now();
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  const mapCloseMs = Date.now() - mapCloseStarted;
  const mapFocusRestored = await trigger.evaluate((el) => document.activeElement === el);
  const width = await page.evaluate(() => innerWidth);

  const mapLazyChunks: ChunkMetric[] = [...lazyScripts.entries()]
    .map(([path, size]) => ({
      path,
      bytes: size.bytes,
      gzip: size.gzip,
      category: "lazy" as const,
    }))
    .sort((a, b) => b.gzip - a.gzip);

  return {
    width,
    stageSwitchMs,
    stageSwitchOverflow,
    nodeSelectMs,
    nodeSelectOverflow,
    mapOpenMs,
    mapCloseMs,
    mapFocusRestored,
    mapOverflow,
    mapLazyScripts: mapLazyChunks.length,
    mapLazyJsBytes: mapLazyChunks.reduce((sum, item) => sum + item.bytes, 0),
    mapLazyJsGzip: mapLazyChunks.reduce((sum, item) => sum + item.gzip, 0),
    mapLazyChunks,
  };
}

/** Evaluates static and browser metrics against Nakama's explicit frontend performance budgets. */
export function evaluateFrontendBudgets(input: {
  staticBuild: StaticBuildAnalysis | null;
  browserRoutes: FrontendRouteMetric[];
  interactions: PreviewInteractionMetric[];
}): BudgetCheck[] {
  const checks: BudgetCheck[] = [];
  const checkMetric = (
    id: string,
    label: string,
    unit: BudgetCheck["unit"],
    actual: number,
    limit: number,
    warn?: number,
  ): BudgetCheck => {
    const status = actual > limit ? "fail" : warn !== undefined && actual > warn ? "warn" : "pass";
    return {
      id,
      label,
      unit,
      actual,
      limit,
      ...(warn !== undefined ? { warn } : {}),
      status,
    };
  };

  const previewBrowser = input.browserRoutes.find(
    (r) => r.route === "/preview" && r.width === 1440,
  );
  const previewStatic = input.staticBuild?.routes.find((r) => r.route === "/preview");
  const previewJsGzip = previewBrowser?.jsGzip ?? previewStatic?.jsGzip;
  if (previewJsGzip !== undefined) {
    checks.push(
      checkMetric(
        "preview-initial-js-gzip",
        "Public preview (/preview) initial JS gzip",
        "bytes",
        previewJsGzip,
        frontendBudgets.previewInitialJsGzip,
        frontendBudgets.previewInitialJsGzipWarn,
      ),
    );
  }

  const landingBrowser = input.browserRoutes.find((r) => r.route === "/" && r.width === 1440);
  const landingStatic = input.staticBuild?.routes.find((r) => r.route === "/");
  const landingJsGzip = landingBrowser?.jsGzip ?? landingStatic?.jsGzip;
  if (landingJsGzip !== undefined) {
    checks.push(
      checkMetric(
        "landing-initial-js-gzip",
        "Public landing (/) initial JS gzip",
        "bytes",
        landingJsGzip,
        frontendBudgets.landingInitialJsGzip,
      ),
    );
  }

  const heaviestRoute = input.staticBuild?.routes[0];
  if (heaviestRoute) {
    checks.push(
      checkMetric(
        "max-route-initial-js-gzip",
        `Heaviest route (${heaviestRoute.route}) initial JS gzip`,
        "bytes",
        heaviestRoute.jsGzip,
        frontendBudgets.maxRouteInitialJsGzip,
        frontendBudgets.maxRouteInitialJsGzipWarn,
      ),
    );
  }

  const cssGzip = previewBrowser?.cssGzip ?? input.staticBuild?.sharedCssGzip;
  if (cssGzip !== undefined) {
    checks.push(
      checkMetric(
        "initial-css-gzip",
        "Initial shared stylesheet gzip",
        "bytes",
        cssGzip,
        frontendBudgets.initialCssGzip,
      ),
    );
  }

  const mapInteraction = input.interactions[0];
  const threeLazyChunk = input.staticBuild?.lazyChunks.find((chunk) =>
    chunk.tags?.includes("three-3d"),
  );
  const mapLazyGzip = mapInteraction?.mapLazyJsGzip ?? threeLazyChunk?.gzip;
  if (mapLazyGzip !== undefined && mapLazyGzip > 0) {
    checks.push(
      checkMetric(
        "map-lazy-js-gzip",
        "On-demand 3D stage map lazy JS gzip",
        "bytes",
        mapLazyGzip,
        frontendBudgets.mapLazyJsGzip,
      ),
    );
  }

  if (input.browserRoutes.length > 0) {
    const maxCls = Math.max(...input.browserRoutes.map((r) => r.cls ?? 0));
    checks.push(
      checkMetric(
        "max-cls",
        "Maximum Cumulative Layout Shift (CLS)",
        "score",
        maxCls,
        frontendBudgets.maxCls,
      ),
    );
    const overflowCount = input.browserRoutes.filter((r) => r.overflow).length;
    checks.push(
      checkMetric(
        "viewport-overflow",
        "Routes with horizontal viewport overflow",
        "count",
        overflowCount,
        0,
      ),
    );
  }

  if (previewBrowser?.domNodes !== undefined) {
    checks.push(
      checkMetric(
        "preview-dom-nodes",
        "Public preview initial DOM node count",
        "count",
        previewBrowser.domNodes,
        frontendBudgets.maxPreviewDomNodes,
      ),
    );
  }

  return checks;
}

/** Compares current metrics against a baseline snapshot (supporting both before.json and report.json). */
export function compareFrontendReports(
  current: {
    staticBuild: StaticBuildAnalysis | null;
    browserRoutes: FrontendRouteMetric[];
    interactions: PreviewInteractionMetric[];
  },
  baselineRaw: unknown,
): MetricDelta[] {
  const parsed = legacyBaselineSchema.safeParse(baselineRaw);
  if (!parsed.success) return [];

  const deltas: MetricDelta[] = [];
  const pushDelta = (metric: string, before: number | undefined, after: number | undefined) => {
    if (before === undefined || after === undefined) return;
    const delta = after - before;
    const percentChange = before !== 0 ? Math.round((delta / before) * 10_000) / 100 : null;
    deltas.push({ metric, before, after, delta, percentChange });
  };

  const currentPreview =
    current.browserRoutes.find((r) => r.route === "/preview" && r.width === 1440) ??
    current.browserRoutes[0];
  const currentStaticPreview = current.staticBuild?.routes.find((r) => r.route === "/preview");
  const afterPreviewGzip = currentPreview?.jsGzip ?? currentStaticPreview?.jsGzip;
  const afterPreviewBytes = currentPreview?.jsBytes ?? currentStaticPreview?.jsBytes;

  if (Array.isArray(parsed.data)) {
    const basePreview =
      parsed.data.find((r) => r.route === "/preview" && r.width === 1440) ?? parsed.data[0];
    pushDelta("/preview initial JS gzip (bytes)", basePreview?.jsGzip, afterPreviewGzip);
    pushDelta("/preview initial JS raw (bytes)", basePreview?.jsBytes, afterPreviewBytes);
    pushDelta("/preview navigation (ms)", basePreview?.navigationMs, currentPreview?.navigationMs);
  } else if ("schemaVersion" in parsed.data) {
    const baseReport = parsed.data;
    const basePreview =
      baseReport.browserRoutes.find((r) => r.route === "/preview" && r.width === 1440) ??
      baseReport.browserRoutes[0];
    const baseStaticPreview = baseReport.staticBuild?.routes.find((r) => r.route === "/preview");
    pushDelta(
      "/preview initial JS gzip (bytes)",
      basePreview?.jsGzip ?? baseStaticPreview?.jsGzip,
      afterPreviewGzip,
    );
    pushDelta(
      "/preview initial JS raw (bytes)",
      basePreview?.jsBytes ?? baseStaticPreview?.jsBytes,
      afterPreviewBytes,
    );
    const baseHeaviest = baseReport.staticBuild?.routes[0];
    const currentHeaviest = current.staticBuild?.routes[0];
    if (baseHeaviest && currentHeaviest && baseHeaviest.route === currentHeaviest.route) {
      pushDelta(
        `${currentHeaviest.route} initial JS gzip (bytes)`,
        baseHeaviest.jsGzip,
        currentHeaviest.jsGzip,
      );
    }
    pushDelta(
      "3D stage map lazy JS gzip (bytes)",
      baseReport.interactions[0]?.mapLazyJsGzip,
      current.interactions[0]?.mapLazyJsGzip,
    );
  } else {
    pushDelta("/preview initial JS gzip (bytes)", parsed.data.jsGzip, afterPreviewGzip);
    pushDelta("/preview initial JS raw (bytes)", parsed.data.jsBytes, afterPreviewBytes);
  }

  return deltas;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB (${bytes.toLocaleString("en-US")} B)`;
}

function formatSignedBytes(delta: number, pct: number | null): string {
  const sign = delta > 0 ? "+" : "";
  const pctText = pct !== null ? ` (${sign}${pct.toFixed(2)}%)` : "";
  return `${sign}${delta.toLocaleString("en-US")} B${pctText}`;
}

export function formatFrontendReportSummary(report: FrontendReport): string {
  const lines: string[] = [];
  lines.push(
    `=== Nakama Frontend Performance Report (${report.gitBranch ?? "local"} @ ${report.gitCommit ?? "uncommitted"}) ===`,
  );

  if (report.staticBuild) {
    const sb = report.staticBuild;
    lines.push(
      `Build ID: ${sb.buildId} | Shared Baseline JS: ${formatBytes(sb.sharedBaselineJsGzip)} gzip (Framework: ${formatBytes(sb.frameworkRuntimeJsGzip)}, Root Layout Shell: ${formatBytes(sb.rootLayoutShellJsGzip)}) | Shared CSS: ${formatBytes(sb.sharedCssGzip)} gzip`,
    );
    lines.push("");
    lines.push("Static First-Load JS by Route (sorted heaviest to lightest):");
    for (const route of sb.routes) {
      const tags = route.notableTags.length > 0 ? ` [${route.notableTags.join(", ")}]` : "";
      lines.push(
        `  ${route.route.padEnd(42)} ${formatBytes(route.jsGzip).padStart(22)} gzip  (route-only: +${formatBytes(route.routeOnlyJsGzip)})${tags}`,
      );
    }
    if (sb.lazyChunks.length > 0) {
      lines.push("");
      lines.push("On-Demand Lazy Chunks (.next/static/chunks):");
      for (const chunk of sb.lazyChunks) {
        const tags = chunk.tags?.length ? ` [${chunk.tags.join(", ")}]` : "";
        lines.push(
          `  ${chunk.path.padEnd(42)} ${formatBytes(chunk.gzip).padStart(22)} gzip${tags}`,
        );
      }
    }
  }

  if (report.browserRoutes.length > 0) {
    lines.push("");
    lines.push("Live Browser Route Measurements:");
    for (const m of report.browserRoutes) {
      const vitals = [
        `nav=${m.navigationMs}ms`,
        m.ttfbMs !== undefined ? `ttfb=${m.ttfbMs}ms` : null,
        m.fcpMs !== undefined && m.fcpMs !== null ? `fcp=${m.fcpMs}ms` : null,
        m.lcpMs !== undefined && m.lcpMs !== null ? `lcp=${m.lcpMs}ms` : null,
        m.cls !== undefined ? `cls=${m.cls}` : null,
        m.domNodes !== undefined ? `dom=${m.domNodes}` : null,
        `overflow=${m.overflow}`,
      ]
        .filter(Boolean)
        .join(", ");
      lines.push(
        `  ${`${m.route} @ ${m.width}px`.padEnd(24)} JS=${formatBytes(m.jsGzip)} gzip (${m.scripts} scripts) | ${vitals}`,
      );
    }
  }

  if (report.interactions.length > 0) {
    lines.push("");
    lines.push("Preview Interactive Journey & Lazy 3D Map:");
    for (const inter of report.interactions) {
      lines.push(
        `  @${inter.width}px: stageSwitch=${inter.stageSwitchMs}ms, nodeSelect=${inter.nodeSelectMs}ms, mapOpen=${inter.mapOpenMs}ms, mapClose=${inter.mapCloseMs}ms, focusRestored=${inter.mapFocusRestored}, mapLazyJS=${formatBytes(inter.mapLazyJsGzip)} gzip`,
      );
    }
  }

  if (report.clientGraph.hotspots.length > 0) {
    lines.push("");
    lines.push(
      `Client Import Graph Optimization Opportunities (${report.clientGraph.hotspots.length} detected across ${report.clientGraph.clientEntrypointCount} client components):`,
    );
    for (const hotspot of report.clientGraph.hotspots) {
      lines.push(
        `  - [${hotspot.id}] ${hotspot.sampleChain.join(" -> ")}\n    Action: ${hotspot.recommendation}`,
      );
    }
  }

  if (report.budgets.length > 0) {
    lines.push("");
    lines.push("Performance Budgets:");
    for (const b of report.budgets) {
      const badge = b.status === "pass" ? "PASS" : b.status === "warn" ? "WARN" : "FAIL";
      const actualStr =
        b.unit === "bytes" ? `${b.actual.toLocaleString("en-US")} B` : String(b.actual);
      const limitStr =
        b.unit === "bytes" ? `${b.limit.toLocaleString("en-US")} B` : String(b.limit);
      lines.push(`  [${badge}] ${b.label}: ${actualStr} (limit <= ${limitStr})`);
    }
  }

  if (report.deltas.length > 0) {
    lines.push("");
    lines.push("Comparison with Local Baseline:");
    for (const d of report.deltas) {
      const change = d.metric.includes("(bytes)")
        ? formatSignedBytes(d.delta, d.percentChange)
        : `${d.delta > 0 ? "+" : ""}${d.delta} (${d.percentChange ?? 0}%)`;
      lines.push(
        `  ${d.metric}: ${d.before.toLocaleString("en-US")} -> ${d.after.toLocaleString("en-US")} (${change})`,
      );
    }
  }

  return lines.join("\n");
}

function readGitMetadata(): { commit: string | null; branch: string | null } {
  try {
    const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return { commit: commit || null, branch: branch || null };
  } catch {
    return { commit: null, branch: null };
  }
}

async function readJsonFile(path: string): Promise<unknown> {
  const text = await readFile(path, "utf8").catch(() => null);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function isServerReachable(origin: string): Promise<boolean> {
  try {
    const res = await fetch(`${origin}/preview`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureLocalServer(baseURL: string): Promise<ChildProcess | null> {
  const parsed = new URL(baseURL);
  if (await isServerReachable(parsed.origin)) return null;
  const port = parsed.port || "3035";
  const child = spawn("npm", ["start", "--", "--port", port], {
    stdio: "ignore",
    env: process.env,
  });
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await isServerReachable(parsed.origin)) return child;
    await new Promise((r) => setTimeout(r, 400));
  }
  child.kill("SIGTERM");
  throw new Error(`Timed out waiting for local production server at ${parsed.origin}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  const staticOnly = args.has("--static") || args.has("--report");
  const jsonOutput = args.has("--json");
  const saveBaseline = args.has("--save-baseline");
  const baseURL = process.env.FRONTEND_BASE_URL ?? "http://localhost:3035";

  const [staticBuild, sources] = await Promise.all([analyzeBuildBundle(".next"), loadSourceMap()]);
  const clientGraph = analyzeClientImportHotspots(sources);

  let browserRoutes: FrontendRouteMetric[] = [];
  let interactions: PreviewInteractionMetric[] = [];

  if (staticOnly) {
    const existingReport = frontendReportSchema.safeParse(
      await readJsonFile(".nakama/performance/report.json"),
    );
    if (existingReport.success) {
      browserRoutes = existingReport.data.browserRoutes;
      interactions = existingReport.data.interactions;
    } else {
      const existingLatest = z
        .array(frontendRouteMetricSchema)
        .safeParse(await readJsonFile(".nakama/performance/latest.json"));
      if (existingLatest.success) browserRoutes = existingLatest.data;
    }
  } else {
    const spawnedServer = await ensureLocalServer(baseURL);
    const browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
    });
    try {
      for (const width of [1440, 390]) {
        const previewPage = await browser.newPage({ viewport: { width, height: 900 } });
        browserRoutes.push(await measureFrontend(previewPage, baseURL, "/preview"));
        await previewPage.close();
      }
      const landingPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      browserRoutes.push(await measureFrontend(landingPage, baseURL, "/"));
      await landingPage.close();

      const interactionPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      interactions.push(await measurePreviewInteractions(interactionPage, baseURL));
      await interactionPage.close();
    } finally {
      await browser.close();
      if (spawnedServer) {
        spawnedServer.kill("SIGTERM");
      }
    }
  }

  const baselineRaw =
    (await readJsonFile(".nakama/performance/baseline.json")) ??
    (await readJsonFile(".nakama/performance/before.json"));

  const budgets = evaluateFrontendBudgets({ staticBuild, browserRoutes, interactions });
  const deltas = compareFrontendReports({ staticBuild, browserRoutes, interactions }, baselineRaw);
  const git = readGitMetadata();

  const report: FrontendReport = frontendReportSchema.parse({
    schemaVersion: 1,
    measuredAt: new Date().toISOString(),
    gitCommit: git.commit,
    gitBranch: git.branch,
    staticBuild,
    clientGraph,
    browserRoutes,
    interactions,
    budgets,
    deltas,
  });

  await mkdir(".nakama/performance", { recursive: true });
  if (!staticOnly && browserRoutes.length > 0) {
    const previewResults = browserRoutes.filter((r) => r.route === "/preview");
    await writeFile(".nakama/performance/latest.json", JSON.stringify(previewResults, null, 2));
  }
  await writeFile(".nakama/performance/report.json", JSON.stringify(report, null, 2));
  if (!staticOnly) {
    const summaryEntry = {
      measuredAt: report.measuredAt,
      gitCommit: report.gitCommit,
      gitBranch: report.gitBranch,
      buildId: staticBuild?.buildId ?? null,
      previewJsGzip:
        browserRoutes.find((r) => r.route === "/preview" && r.width === 1440)?.jsGzip ??
        staticBuild?.routes.find((r) => r.route === "/preview")?.jsGzip ??
        null,
      heaviestRoute: staticBuild?.routes[0]?.route ?? null,
      heaviestRouteJsGzip: staticBuild?.routes[0]?.jsGzip ?? null,
      mapLazyJsGzip: interactions[0]?.mapLazyJsGzip ?? null,
      hotspotCount: clientGraph.hotspots.length,
    };
    await appendFile(".nakama/performance/history.jsonl", `${JSON.stringify(summaryEntry)}\n`);
  }
  if (saveBaseline) {
    await writeFile(".nakama/performance/baseline.json", JSON.stringify(report, null, 2));
  }

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatFrontendReportSummary(report));
    const before = baselineRaw as { jsGzip?: number } | null;
    const previewDesktop = browserRoutes.find((r) => r.route === "/preview" && r.width === 1440);
    if (before && typeof before.jsGzip === "number" && previewDesktop) {
      console.log(
        `\nInitial gzip JS compared with local baseline: ${before.jsGzip} → ${previewDesktop.jsGzip} bytes.`,
      );
    }
  }

  if (budgets.some((b) => b.status === "fail")) {
    process.exitCode = 1;
  }
}
