import { fileURLToPath } from "node:url";
import { SourceMap, type SourceMapPayload } from "node:module";
import { constants, openSync, closeSync, fstatSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { errorInfoSchema, type LogRecord } from "@/server/observability/log-model";

type Frame = NonNullable<LogRecord["source"]>;
function boundedFile(path: string, max: number) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > max) throw new Error("Invalid map input");
    return readFileSync(fd, "utf8");
  } finally {
    closeSync(fd);
  }
}
// Offline only: explicit build identity prevents symbolication against unrelated code.
export function symbolicate(
  record: LogRecord,
  mapsFolder: string,
): { source?: Frame; status: "mapped" | "already_source" | "missing_map" | "build_mismatch" } {
  const frame = record.source ?? record.error?.frames[0];
  if (frame && !frame.file.startsWith(".next/")) return { source: frame, status: "already_source" };
  if (!frame) return { status: "missing_map" };
  try {
    const folder = resolve(mapsFolder);
    const build = boundedFile(resolve(folder, "BUILD_ID"), 256).trim();
    if (!record.buildId || record.buildId !== build) return { status: "build_mismatch" };
    const path = resolve(folder, frame.file.slice(".next/".length) + ".map");
    if (!path.startsWith(folder + sep)) return { status: "missing_map" };
    const raw: unknown = JSON.parse(boundedFile(path, 32 * 1024 * 1024));
    if (!raw || typeof raw !== "object" || !("version" in raw) || raw.version !== 3)
      return { status: "missing_map" };
    const map = new SourceMap(raw as SourceMapPayload);
    const entry = map.findEntry(frame.line - 1, frame.column - 1);
    if (!("originalSource" in entry) || typeof entry.originalSource !== "string")
      return { status: "missing_map" };
    const origin = entry.originalSource;
    const file =
      origin.startsWith("turbopack://") && origin.includes("[project]/")
        ? origin.replace(/^.*?\[project\]\//, "")
        : origin.startsWith("file://")
          ? relative(process.cwd(), fileURLToPath(origin))
          : relative(process.cwd(), resolve(dirname(path), origin));
    const parsed = errorInfoSchema.shape.frames.element.safeParse({
      file,
      line: entry.originalLine + 1,
      column: entry.originalColumn + 1,
    });
    return parsed.success ? { source: parsed.data, status: "mapped" } : { status: "missing_map" };
  } catch {
    return { status: "missing_map" };
  }
}
