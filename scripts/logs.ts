import { diagnosticCatalog } from "../src/server/observability/diagnostics";
import { symbolicate } from "../src/server/observability/log-symbolication";
import { resolve } from "node:path";
import { defaultLogFile } from "../src/server/observability/log-file";
import {
  logArchives,
  readLogFiles,
  summarizeLogs,
  summarizeDiagnostics,
} from "../src/server/observability/log-reader";

const args = process.argv.slice(2);
function option(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
const command = args[0] && !args[0].startsWith("--") ? args[0] : "summary";
if (
  !["summary", "recent", "errors", "trace", "query", "diagnostics", "doctor", "show"].includes(
    command,
  )
)
  throw new Error(
    "Use summary, diagnostics, doctor, show ERROR_OR_TRACE_ID, recent, errors, trace UUID, or query HASH.",
  );
const since = option("--since") ?? "1h";
const match = since.match(/^(\d+)(m|h|d)$/);
if (!match) throw new Error("Use --since with minutes, hours or days, for example 30m or 1h.");
const sinceMs =
  Number(match[1]) * (match[2] === "d" ? 86400000 : match[2] === "h" ? 3600000 : 60000);
const limit = Number(option("--limit") ?? 50);
if (!Number.isInteger(limit) || limit < 1 || limit > 10000)
  throw new Error("Limit must be between 1 and 10000.");
if (command === "trace" && !/^[a-f0-9-]{36}$/i.test(args[1] ?? ""))
  throw new Error("Supply the trace UUID.");
if (command === "show" && !/^(?:[a-f0-9-]{36}|[A-Za-z0-9_-]{4,40})$/i.test(args[1] ?? ""))
  throw new Error("Supply the error ID, trace UUID, or the reference shown on an error page.");
if (command === "query" && !/^[a-f0-9]{16}$/.test(args[1] ?? ""))
  throw new Error("Supply the query fingerprint.");
const explicitFile = option("--file");
const localFile =
  process.env.NAKAMA_LOG_FILE && process.env.NAKAMA_LOG_FILE !== "off"
    ? resolve(process.env.NAKAMA_LOG_FILE)
    : defaultLogFile();
const files = explicitFile
  ? logArchives(resolve(explicitFile))
  : [
      ...logArchives(localFile),
      ...logArchives(resolve(".nakama/logs/vercel.jsonl")),
      ...logArchives(resolve(".nakama/logs/checks.jsonl")),
    ];
const input = readLogFiles(files);
let records = input.records.filter((r) => Date.parse(r.timestamp) >= Date.now() - sinceMs);
if (command === "trace") records = records.filter((r) => r.traceId === args[1]);
if (command === "query")
  records = records.filter(
    (r) =>
      r.queryId === args[1] ||
      (r.error?.diagnostic?.code === "DB_RESULT_INVALID" && r.error.diagnostic.queryId === args[1]),
  );
if (command === "errors") records = records.filter((r) => r.level === "error");
const json = args.includes("--json");
const failOn = option("--fail-on");
if (failOn !== undefined && failOn !== "unexpected")
  throw new Error("--fail-on only supports: unexpected.");
if (["diagnostics", "doctor", "show"].includes(command)) {
  const family = option("--family"),
    code = option("--code");
  if (
    family &&
    !["type", "build", "contract", "backend", "database", "dependency", "compute"].includes(family)
  )
    throw new Error("Unknown diagnostic family.");
  if (code && !Object.hasOwn(diagnosticCatalog, code)) throw new Error("Unknown diagnostic code.");
  if (command === "show") {
    const roots = records.filter(
      (r) => r.error?.id === args[1] || r.error?.digest === args[1] || r.traceId === args[1],
    );
    const matching = new Set(roots.map((r) => r.traceId));
    const requests = new Set(
      roots
        .filter((r) => r.platformRequestId && r.deploymentId)
        .map((r) => `${r.deploymentId}:${r.platformRequestId}`),
    );
    records = records.filter(
      (r) =>
        matching.has(r.traceId) ||
        (r.platformRequestId &&
          r.deploymentId &&
          requests.has(`${r.deploymentId}:${r.platformRequestId}`)),
    );
  }
  const report = summarizeDiagnostics(records);
  report.entries = report.entries
    .filter(
      (e) => (!family || e.diagnostic.family === family) && (!code || e.diagnostic.code === code),
    )
    .slice(-limit);
  const maps = option("--maps");
  const locations = maps
    ? report.entries.map((entry) => {
        const record = records.find((r) =>
          entry.errorId
            ? r.error?.id === entry.errorId
            : r.traceId === entry.traceId && r.timestamp === entry.timestamp,
        );
        return {
          traceId: entry.traceId,
          ...(record ? symbolicate(record, maps) : { status: "missing_map" }),
        };
      })
    : [];
  if (json) console.log(JSON.stringify({ ...report, symbolication: locations }, null, 2));
  else {
    console.log(
      `${report.total} diagnostics · ${report.legacyErrors} legacy error events without detailed classification`,
    );
    console.table(report.families);
    if (report.checks.length) console.table(report.checks.slice(-limit));
    for (const entry of report.entries) {
      console.log(
        `${entry.timestamp} [${entry.diagnostic.family}] ${entry.diagnostic.code}: ${entry.guidance.title}`,
      );
      console.log(
        `  trace=${entry.traceId} release=${entry.release} build=${entry.buildId ?? "unknown"}${entry.source ? ` source=${entry.source.file}:${entry.source.line}:${entry.source.column}` : ""}`,
      );
      if (entry.relatedTraces.length > 1)
        console.log(`  related traces=${entry.relatedTraces.join(",")}`);
      console.log(
        `  evidence=${JSON.stringify(entry.diagnostic)} transactions=${entry.transactionOutcomes.join(",") || "not observed"}`,
      );
      console.log(
        `  check: ${entry.guidance.check} Retry policy: ${entry.guidance.retry}; no automatic replay.`,
      );
      if (entry.platformRequestId || entry.deploymentId)
        console.log(
          `  hosting request=${entry.platformRequestId ?? "unknown"} deployment=${entry.deploymentId ?? "unknown"}`,
        );
    }
    if (locations.length)
      console.table(
        locations.map((l) => ({
          trace: l.traceId,
          status: l.status,
          source:
            "source" in l && l.source ? `${l.source.file}:${l.source.line}:${l.source.column}` : "",
        })),
      );
    console.log(report.coverage);
    if (input.ignored)
      console.log(`${input.ignored} malformed, unsupported, or unrelated lines skipped.`);
  }
} else if (command === "summary") {
  const summary = {
    ...summarizeLogs(records),
    filesRead: input.found,
    ignoredLines: input.ignored,
  };
  if (json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(
      `${summary.events} events · ${summary.traces} traces · ${summary.unexpectedErrors} unexpected errors · ${summary.filesRead} log files`,
    );
    if (summary.diagnosticCounts.total) {
      console.log(
        `${summary.diagnosticCounts.total} classified diagnostics; use npm run logs -- doctor for evidence and guidance.`,
      );
      console.table(summary.diagnosticCounts.families);
    }
    if (summary.sinkWarnings)
      console.log(
        `${summary.sinkWarnings} file-sink warnings: inspect recent events for sinkFailure; stdout events may have no local copy.`,
      );
    if (summary.invalidRecordWarnings)
      console.log(
        `${summary.invalidRecordWarnings} records were replaced because they failed validation (see invalidFields): some events in this window are missing.`,
      );
    if (!summary.events)
      console.log(
        "No events in this window. Run the app or import production events with npm run logs:pull.",
      );
    if (summary.errors.length)
      console.table(
        summary.errors.map((e) => ({
          fingerprint: e.fingerprint,
          type: e.type,
          code: e.code ?? "",
          count: e.count,
          trace: e.traces[0],
          source: e.source ? `${e.source.file}:${e.source.line}` : "",
        })),
      );
    if (summary.operations.length) console.table(summary.operations);
    if (summary.queries.length)
      console.table(
        summary.queries.map((q) => ({
          ...q,
          source: q.source ? `${q.source.file}:${q.source.line}` : "",
        })),
      );
    for (const error of summary.errors)
      if (error.hint) console.log(`${error.fingerprint}: ${error.hint}`);
    console.log(summary.queryCoverage);
    if (summary.ignoredLines)
      console.log(`${summary.ignoredLines} malformed, oversized, or unrelated lines were skipped.`);
  }
} else {
  const visible = records.slice(-limit);
  if (json) for (const record of visible) console.log(JSON.stringify(record));
  else
    for (const r of visible)
      console.log(
        `${r.timestamp} ${r.level.padEnd(5)} ${r.event} ${r.operation} ${r.durationMs ?? "-"}ms ${r.outcome ?? ""} trace=${r.traceId} span=${r.spanId}${r.queryId ? ` query=${r.queryId}` : ""}${r.error ? ` error=${r.error.id} ${r.error.type} ${r.error.code ?? ""}` : ""}${r.source ? ` ${r.source.file}:${r.source.line}` : ""}`,
      );
}
// Give scripts and agents a verdict: exit 2 when the window holds unexpected failures. Expected
// rejections, conflicts and navigation never trip this. An empty window still exits 0 and proves nothing.
if (failOn === "unexpected" && summarizeLogs(records).unexpectedErrors > 0) process.exitCode = 2;
