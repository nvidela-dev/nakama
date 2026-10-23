import { collectorDiagnostic } from "../src/server/observability/collector-diagnostics";
import { telemetry } from "../src/server/observability/observability";
import { diagnosticCatalog } from "../src/server/observability/diagnostics";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { parseLogLines } from "../src/server/observability/log-reader";
import { rotatingFileSink } from "../src/server/observability/log-file";
const args = process.argv.slice(2);
function option(name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
const until = option("--until");
// Vercel's runtime log endpoint rejects a one-hour request window. Match its
// documented 30-minute default so a plain `npm run logs:pull` works reliably.
const since = option("--since") ?? "30m",
  environment = option("--environment") ?? "production",
  limit = option("--limit") ?? "1000";
const time = (value: string) =>
  /^\d+(m|h|d)$/.test(value) ||
  (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)));
if (
  !time(since) ||
  (until !== undefined && !time(until)) ||
  !["production", "preview"].includes(environment) ||
  !/^\d+$/.test(limit) ||
  Number(limit) < 1 ||
  Number(limit) > 10000
)
  throw new Error("Use --since 1h, --environment production|preview, --limit 1–10000.");
try {
  // No shell, tokens, raw platform records, or provider stderr are written to disk.
  const output = execFileSync(
    "vercel",
    [
      "logs",
      "runtime",
      "--json",
      "--environment",
      environment,
      "--since",
      since,
      ...(until ? ["--until", until] : []),
      "--limit",
      limit,
    ],
    {
      encoding: "utf8",
      timeout: 45000,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const parsed = parseLogLines(output);
  const file = resolve(".nakama/logs/vercel.jsonl"),
    write = rotatingFileSink(file);
  for (const record of parsed.records) write(record);
  console.log(
    `Imported ${parsed.records.length} validated Nakama events into ${file}. Only validated application records and explicitly identified hosting failures were retained.`,
  );
  console.log(
    `Fetch is bounded to ${limit} platform entries. Narrow --since or increase --limit if the window is busy; summaries deduplicate overlapping imports.`,
  );
} catch (error) {
  const diagnostic = collectorDiagnostic(error);
  telemetry.run("diagnostics.collect", () => telemetry.diagnostic(diagnostic));
  process.stderr.write(
    `${diagnostic.code}: ${diagnosticCatalog[diagnostic.code].title}${diagnostic.family === "dependency" && diagnostic.provider === "vercel" ? ` (${diagnostic.reason})` : ""}.\n`,
  );
  if (
    diagnostic.family === "dependency" &&
    diagnostic.provider === "vercel" &&
    diagnostic.reason === "invalid_time_window"
  )
    process.stderr.write(
      "Choose --since within the hosting provider's available log history. A rejected query is not an empty successful result.\n",
    );
  process.stderr.write(
    "Could not import logs. Check the Vercel CLI login, linked project access, and requested time window. No raw provider output was saved.\n",
  );
  process.exitCode = 1;
}
