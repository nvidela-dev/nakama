import { constants, openSync, closeSync, fstatSync, readFileSync } from "node:fs";
import { platformDiagnostic } from "@/server/observability/platform-diagnostics";
import { diagnosticCatalog, type Diagnostic } from "@/server/observability/diagnostics";
import { logRecordSchema, type LogRecord } from "@/server/observability/log-model";

// Imported platform envelopes are never persisted. Only our validated event is kept.
export function parseLogLines(input: string): { records: LogRecord[]; ignored: number } {
  const records: LogRecord[] = [];
  let ignored = 0;
  for (const line of input.split("\n")) {
    if (!line.trim()) continue;
    if (line.length > 65536) {
      ignored++;
      continue;
    }
    try {
      const envelope: unknown = JSON.parse(line);
      let candidate = envelope;
      if (envelope && typeof envelope === "object" && "type" in envelope) {
        if (envelope.type !== "log") continue;
        if (!("data" in envelope) || !envelope.data || typeof envelope.data !== "object") {
          ignored++;
          continue;
        }
        const hosting = platformDiagnostic(envelope.data);
        if (hosting) {
          records.push(hosting);
          continue;
        }
        if (!("message" in envelope.data) || typeof envelope.data.message !== "string") {
          ignored++;
          continue;
        }
        candidate = JSON.parse(envelope.data.message);
      }
      const decoded = logRecordSchema.safeParse(candidate);
      if (decoded.success) {
        const record = decoded.data;
        // Preserve safe hosting correlation fields on application records too.
        if (
          envelope &&
          typeof envelope === "object" &&
          "data" in envelope &&
          envelope.data &&
          typeof envelope.data === "object"
        ) {
          const context = logRecordSchema
            .pick({ platformRequestId: true, deploymentId: true })
            .safeParse({
              ...("requestId" in envelope.data
                ? { platformRequestId: envelope.data.requestId }
                : {}),
              ...("deploymentId" in envelope.data
                ? { deploymentId: envelope.data.deploymentId }
                : {}),
            });
          if (context.success) Object.assign(record, context.data);
        }
        records.push(record);
      } else ignored++;
    } catch {
      ignored++;
    }
  }
  return { records, ignored };
}
export function readLogFiles(files: string[]) {
  const records: LogRecord[] = [];
  let ignored = 0,
    found = 0;
  for (const path of files) {
    let fd: number | undefined;
    try {
      fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.size > 8 * 1024 * 1024)
        throw new Error("Log input is not a bounded regular file");
      const parsed = parseLogLines(readFileSync(fd, "utf8"));
      records.push(...parsed.records);
      ignored += parsed.ignored;
      found++;
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT"))
        ignored++;
    } finally {
      if (fd !== undefined) closeSync(fd);
    }
  }
  // Fetches can overlap and Vercel pagination can repeat boundary entries.
  const unique = new Map(records.map((record) => [JSON.stringify(record), record]));
  return {
    records: [...unique.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    ignored,
    found,
  };
}
export const logArchives = (path: string) => [3, 2, 1, 0].map((n) => (n ? `${path}.${n}` : path));
function percentile(values: number[], fraction: number) {
  return values.length
    ? values.slice().sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1]
    : undefined;
}
const hints: Record<string, string> = {
  DB_RESULT_INVALID:
    "A query result failed its decoder. Inspect its source frame and recent SQL/schema changes.",
  "40P01":
    "Database deadlock. Inspect lock acquisition order for the linked trace; do not blindly replay writes.",
  "40001":
    "Serialization conflict. Verify whether this operation is safe to retry as a whole transaction.",
  "23505": "Unique constraint rejected a write. Check duplicate submission and ordering logic.",
  "23503": "Foreign key rejected a write. Check nested-resource identity and concurrent deletion.",
  "23514": "Database invariant rejected a write. Compare the operation with the schema guards.",
  "57014": "Database query was cancelled. Check time limits and the query's duration.",
  ECONNRESET: "Database/provider connection reset. Check provider status and connection lifecycle.",
  ETIMEDOUT: "Connection or operation timed out. Inspect duration and provider availability.",
};
export function summarizeLogs(records: LogRecord[]) {
  const errors = new Map<
    string,
    {
      fingerprint: string;
      type: string;
      code?: string;
      count: number;
      traces: string[];
      source?: LogRecord["source"];
      hint?: string;
    }
  >();
  const seenErrors = new Set<string>();
  const operations = new Map<
    string,
    {
      operation: string;
      count: number;
      failed: number;
      rejected: number;
      durations: number[];
      queries: number;
    }
  >();
  const queries = new Map<
    string,
    { queryId: string; count: number; failed: number; maxMs: number; source?: LogRecord["source"] }
  >();
  for (const record of records) {
    if (
      record.error &&
      record.error.category === "unexpected" &&
      !seenErrors.has(record.error.id)
    ) {
      seenErrors.add(record.error.id);
      const error = record.error,
        previous = errors.get(error.fingerprint) ?? {
          fingerprint: error.fingerprint,
          type: error.type,
          count: 0,
          traces: [],
          ...(error.code ? { code: error.code } : {}),
          ...(error.frames[0] ? { source: error.frames[0] } : {}),
          ...(error.code && hints[error.code] ? { hint: hints[error.code] } : {}),
        };
      previous.count++;
      if (!previous.traces.includes(record.traceId) && previous.traces.length < 3)
        previous.traces.push(record.traceId);
      errors.set(error.fingerprint, previous);
    }
    if (record.event === "operation.finish") {
      const operation = operations.get(record.operation) ?? {
        operation: record.operation,
        count: 0,
        failed: 0,
        rejected: 0,
        durations: [],
        queries: 0,
      };
      operation.count++;
      if (record.outcome === "failed") operation.failed++;
      if (record.outcome === "rejected") operation.rejected++;
      if (record.durationMs !== undefined) operation.durations.push(record.durationMs);
      operation.queries += record.queryCount ?? 0;
      operations.set(record.operation, operation);
    }
    if (record.queryId) {
      const query = queries.get(record.queryId) ?? {
        queryId: record.queryId,
        count: 0,
        failed: 0,
        maxMs: 0,
        ...(record.source ? { source: record.source } : {}),
      };
      query.count++;
      if (record.outcome === "failed") query.failed++;
      query.maxMs = Math.max(query.maxMs, record.durationMs ?? 0);
      queries.set(record.queryId, query);
    }
  }
  const diagnostics = summarizeDiagnostics(records);
  return {
    diagnosticCounts: {
      total: diagnostics.total,
      families: diagnostics.families,
      codes: diagnostics.codes,
      legacyErrors: diagnostics.legacyErrors,
    },
    events: records.length,
    traces: new Set(records.map((r) => r.traceId)).size,
    unexpectedErrors: seenErrors.size,
    sinkWarnings: records.filter((r) => r.event === "logging.sink_error").length,
    errors: [...errors.values()].sort((a, b) => b.count - a.count),
    operations: [...operations.values()].map(({ durations, ...operation }) => ({
      ...operation,
      p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
    })),
    queries: [...queries.values()]
      .sort((a, b) => b.failed - a.failed || b.maxMs - a.maxMs)
      .slice(0, 20),
    queryCoverage:
      "At info level, successful fast query events are omitted; operation totals include them. Debug includes every query.",
  };
}

// V1 records without diagnostic data remain readable and are explicitly legacy.
export function diagnosticEntries(records: LogRecord[]) {
  const seen = new Set<string>();
  const transactions = new Map<string, Set<LogRecord["outcome"]>>();
  const requestTraces = new Map<string, Set<string>>();
  const requestKey = (r: LogRecord) =>
    r.platformRequestId && r.deploymentId ? `${r.deploymentId}:${r.platformRequestId}` : undefined;
  for (const record of records) {
    const key = requestKey(record);
    if (key) {
      const traces = requestTraces.get(key) ?? new Set<string>();
      traces.add(record.traceId);
      requestTraces.set(key, traces);
    }
  }
  for (const record of records)
    if (record.event === "db.transaction") {
      const outcomes = transactions.get(record.traceId) ?? new Set<LogRecord["outcome"]>();
      outcomes.add(record.outcome);
      transactions.set(record.traceId, outcomes);
    }
  return records.flatMap((record) => {
    const diagnostic = record.error?.diagnostic ?? record.diagnostic;
    if (!diagnostic) return [];
    const identity =
      record.error?.id ??
      JSON.stringify([record.timestamp, record.traceId, record.spanId, diagnostic, record.source]);
    if (seen.has(identity)) return [];
    seen.add(identity);
    const source = record.source ?? record.error?.frames[0];
    const key = requestKey(record);
    const relatedTraces = key
      ? [...(requestTraces.get(key) ?? [record.traceId])]
      : [record.traceId];
    return [
      {
        diagnostic,
        guidance: {
          ...diagnosticCatalog[diagnostic.code],
          check:
            diagnostic.family === "dependency" &&
            diagnostic.provider === "vercel" &&
            diagnostic.reason === "invalid_time_window"
              ? "The requested hosting window is outside the available range. Choose an interval within provider history; a rejected query is not evidence that no failures occurred."
              : diagnostic.code === "DATABASE_SQL_FAILED" &&
                  diagnostic.sqlState &&
                  hints[diagnostic.sqlState]
                ? `${hints[diagnostic.sqlState]} ${diagnosticCatalog[diagnostic.code].check}`
                : diagnosticCatalog[diagnostic.code].check,
        },
        timestamp: record.timestamp,
        traceId: record.traceId,
        ...(record.error
          ? { errorId: record.error.id, fingerprint: record.error.fingerprint }
          : {}),
        operation: record.operation,
        release: record.release,
        ...(record.buildId ? { buildId: record.buildId } : {}),
        ...(record.deploymentId ? { deploymentId: record.deploymentId } : {}),
        ...(record.platformRequestId ? { platformRequestId: record.platformRequestId } : {}),
        ...(source ? { source } : {}),
        relatedTraces,
        transactionOutcomes: [
          ...new Set(relatedTraces.flatMap((trace) => [...(transactions.get(trace) ?? [])])),
        ],
      },
    ];
  });
}
export function summarizeDiagnostics(records: LogRecord[]) {
  const entries = diagnosticEntries(records);
  const families: Partial<Record<Diagnostic["family"], number>> = {};
  const codes: Record<string, number> = {};
  for (const entry of entries) {
    families[entry.diagnostic.family] = (families[entry.diagnostic.family] ?? 0) + 1;
    codes[entry.diagnostic.code] = (codes[entry.diagnostic.code] ?? 0) + 1;
  }
  return {
    total: entries.length,
    families,
    codes,
    legacyErrors: records.filter((r) => r.error && !r.error.diagnostic).length,
    checks: records
      .filter((r) => r.event === "check.finish")
      .map((r) => ({
        timestamp: r.timestamp,
        check: r.check,
        outcome: r.outcome,
        buildId: r.buildId,
      })),
    coverage:
      "Only collected evidence is represented. Missing events do not establish health; hosting entries without build metadata require matching deployment source. No writes are retried automatically.",
    entries,
  };
}
