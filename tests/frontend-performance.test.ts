import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeClientImportHotspots,
  classifyChunkContent,
  compareFrontendReports,
  evaluateFrontendBudgets,
  frontendBudgets,
} from "../scripts/frontend-metrics";

test("classifyChunkContent identifies heavy frontend runtime libraries and dictionaries", () => {
  assert.deepEqual(
    classifyChunkContent("new WebGLRenderer(); PerspectiveCamera", "0gc7ylq70fhps.js"),
    ["three-3d"],
  );
  assert.deepEqual(classifyChunkContent('{"EJEMPLO DE SOLO LECTURA":"1"}', "1x6qh7a7k7epi.js"), [
    "es-dictionary",
  ]);
  assert.deepEqual(classifyChunkContent("class ZodError extends Error {}", "44pyx18cenrd9.js"), [
    "zod",
  ]);
  assert.deepEqual(classifyChunkContent('e.s(["AnswerEditor",0,()=>null])', "2b-iggwe6uap_.js"), [
    "answer-editor",
  ]);
});

test("analyzeClientImportHotspots flags static client paths to es.json and zod while respecting dynamic boundaries", () => {
  const analysis = analyzeClientImportHotspots(
    new Map(
      Object.entries({
        "src/features/collaboration/components/feed.tsx":
          '"use client"; import { formatDate } from "@/shared/i18n/index"; export const Feed = () => formatDate(new Date(), "en");',
        "src/shared/i18n/index.ts":
          'import spanish from "@/shared/i18n/es.json"; export const formatDate = (d: Date, l: string) => String(d) + l + Boolean(spanish);',
        "src/shared/i18n/es.json": '{"hello":"hola"}',
        "src/features/tasks/components/list.tsx":
          '"use client"; import { parseLockInFile } from "../lockin-format"; export const List = () => parseLockInFile;',
        "src/features/tasks/lockin-format.ts":
          'import { z } from "zod"; export const parseLockInFile = z.string();',
        "src/features/guidance/components/journey.tsx":
          '"use client"; import dynamic from "next/dynamic"; const MapView = dynamic(() => import("./journey-miniview"), { ssr: false }); export const Journey = () => MapView;',
        "src/features/guidance/components/journey-miniview.tsx":
          '"use client"; import * as THREE from "three"; export default function Miniview() { return Boolean(THREE); }',
        "src/shared/i18n/provider.tsx":
          '"use client"; import type { Locale } from "./index"; export const P = (l: Locale) => l;',
      }),
    ),
  );

  assert.equal(analysis.clientEntrypointCount, 5);
  assert.equal(analysis.dynamicBoundaries.length, 1);
  assert.equal(analysis.dynamicBoundaries[0]?.ssrFalse, true);
  assert.equal(
    analysis.dynamicBoundaries[0]?.target,
    "src/features/guidance/components/journey-miniview.tsx",
  );

  const ids = analysis.hotspots.map((h) => h.id);
  assert.deepEqual(ids, ["client-es-dictionary", "client-zod-runtime"]);
  assert.deepEqual(analysis.hotspots[0]?.sampleChain, [
    "src/features/collaboration/components/feed.tsx",
    "src/shared/i18n/index.ts",
    "src/shared/i18n/es.json",
  ]);
});

test("evaluateFrontendBudgets distinguishes pass, warn, and fail thresholds", () => {
  const passing = evaluateFrontendBudgets({
    staticBuild: {
      buildId: "test-build",
      frameworkRuntimeJsBytes: 400_000,
      frameworkRuntimeJsGzip: 130_000,
      rootLayoutShellJsBytes: 200_000,
      rootLayoutShellJsGzip: 63_000,
      sharedBaselineJsBytes: 600_000,
      sharedBaselineJsGzip: 193_000,
      polyfillJsBytes: 11_000,
      polyfillJsGzip: 3_600,
      sharedCssBytes: 69_000,
      sharedCssGzip: 12_800,
      routes: [
        {
          route: "/projects/[projectId]",
          scripts: 15,
          jsBytes: 914_000,
          jsGzip: 274_000,
          routeOnlyScripts: 4,
          routeOnlyJsBytes: 314_000,
          routeOnlyJsGzip: 81_000,
          cssFiles: 1,
          cssBytes: 69_000,
          cssGzip: 12_800,
          clientBoundaries: [],
          notableTags: ["es-dictionary", "zod"],
        },
        {
          route: "/preview",
          scripts: 12,
          jsBytes: 683_000,
          jsGzip: 202_000,
          routeOnlyScripts: 1,
          routeOnlyJsBytes: 22_000,
          routeOnlyJsGzip: 6_000,
          cssFiles: 1,
          cssBytes: 69_000,
          cssGzip: 12_800,
          clientBoundaries: [],
          notableTags: ["journey-ui"],
        },
      ],
      lazyChunks: [
        {
          path: "/_next/static/chunks/three.js",
          bytes: 551_000,
          gzip: 135_751,
          category: "lazy",
          tags: ["three-3d"],
        },
      ],
    },
    browserRoutes: [
      {
        route: "/preview",
        width: 1440,
        overflow: false,
        scripts: 12,
        jsBytes: 673_000,
        jsGzip: 202_000,
        navigationMs: 320,
        cssGzip: 12_800,
        cls: 0,
        domNodes: 420,
      },
    ],
    interactions: [],
  });

  assert.equal(passing.find((b) => b.id === "preview-initial-js-gzip")?.status, "pass");
  assert.equal(passing.find((b) => b.id === "max-route-initial-js-gzip")?.status, "warn");
  assert.equal(passing.find((b) => b.id === "map-lazy-js-gzip")?.status, "pass");

  const failing = evaluateFrontendBudgets({
    staticBuild: null,
    browserRoutes: [
      {
        route: "/preview",
        width: 390,
        overflow: true,
        scripts: 12,
        jsBytes: 800_000,
        jsGzip: frontendBudgets.previewInitialJsGzip + 5_000,
        navigationMs: 500,
        cls: 0.12,
      },
    ],
    interactions: [],
  });
  assert.equal(failing.find((b) => b.id === "viewport-overflow")?.status, "fail");
  assert.equal(failing.find((b) => b.id === "max-cls")?.status, "fail");
});

test("compareFrontendReports computes deltas from legacy before.json and array baselines", () => {
  const deltas = compareFrontendReports(
    {
      staticBuild: null,
      browserRoutes: [
        {
          route: "/preview",
          width: 1440,
          overflow: false,
          scripts: 12,
          jsBytes: 673_284,
          jsGzip: 199_255,
          navigationMs: 350,
        },
      ],
      interactions: [],
    },
    {
      route: "/preview",
      width: 1440,
      scripts: 14,
      jsBytes: 786_317,
      jsGzip: 236_662,
      overflow: false,
    },
  );
  assert.equal(deltas.length, 2);
  assert.equal(deltas[0]?.delta, -37_407);
  assert.equal(deltas[0]?.percentChange, -15.81);
});
