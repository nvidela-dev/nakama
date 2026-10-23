import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { analyzeBuildBundle, evaluateFrontendBudgets } from "./frontend-metrics";

async function traces(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? traces(join(directory, entry.name))
          : Promise.resolve(entry.name.endsWith(".nft.json") ? [join(directory, entry.name)] : []),
      ),
    )
  ).flat();
}

const files = await traces(".next/server");
if (!files.length) throw new Error("Build the application before inspecting deployment traces.");
const forbidden =
  /(?:^|\/)(?:storybook-static|\.storybook|@storybook|storybook|@axe-core)(?:\/|$)|\.stories\.[cm]?[jt]sx?$/;
for (const file of files) {
  const trace: unknown = JSON.parse(await readFile(file, "utf8"));
  if (
    !trace ||
    typeof trace !== "object" ||
    !("files" in trace) ||
    !Array.isArray(trace.files) ||
    !trace.files.every((entry: unknown) => typeof entry === "string")
  )
    throw new Error("Invalid deployment trace.");
  if (trace.files.some((entry: string) => forbidden.test(entry)))
    throw new Error("Development-only UI tooling was found in application deployment traces.");
}

const staticBuild = await analyzeBuildBundle(".next");
if (!staticBuild || staticBuild.routes.length === 0)
  throw new Error("Build manifest is missing static route bundle metadata.");

const budgets = evaluateFrontendBudgets({
  staticBuild,
  browserRoutes: [],
  interactions: [],
});
const failed = budgets.filter((b) => b.status === "fail");
if (failed.length > 0) {
  throw new Error(
    `Frontend bundle exceeded performance budgets:\n${failed.map((f) => `  - ${f.label}: ${f.actual} > ${f.limit}`).join("\n")}`,
  );
}

const previewRoute = staticBuild.routes.find((r) => r.route === "/preview");
const heaviestRoute = staticBuild.routes[0];
const threeLazy = staticBuild.lazyChunks.find((c) => c.tags?.includes("three-3d"));
console.log(
  `Frontend bundle verified: ${files.length} deployment traces exclude Storybook, stories, and accessibility test tooling; ${staticBuild.routes.length} routes checked (/preview ${previewRoute?.jsGzip.toLocaleString("en-US") ?? "n/a"} B gzip, heaviest ${heaviestRoute?.route ?? "n/a"} ${heaviestRoute?.jsGzip.toLocaleString("en-US") ?? "n/a"} B gzip, lazy 3D map ${threeLazy?.gzip.toLocaleString("en-US") ?? "n/a"} B gzip).`,
);
