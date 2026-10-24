import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { relative, resolve } from "node:path";
import { existsSync } from "node:fs";
import { performance } from "node:perf_hooks";
import {
  errorInfoSchema,
  logRecordSchema,
  type ErrorInfo,
  type LogEvent,
  type LogLevel,
  type LogRecord,
  type OperationName,
  type RouteName,
} from "@/server/observability/log-model";
import {
  DiagnosticError,
  diagnosticCatalog,
  transportCodes,
  type Diagnostic,
} from "@/server/observability/diagnostics";
import { ProjectError } from "@/shared/contracts/errors";
import { configuredLogFile, rotatingFileSink } from "@/server/observability/log-file";

const hash = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);
const ranks = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };
type Context = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: OperationName;
  route: RouteName;
  transaction?: { rollbackFailed: boolean };
  stats: { queryCount: number; queryDurationMs: number; failure?: ErrorInfo };
};
type Details = Pick<
  LogRecord,
  | "durationMs"
  | "outcome"
  | "queryCount"
  | "queryDurationMs"
  | "queryId"
  | "queryKind"
  | "rowCount"
  | "source"
  | "error"
  | "pool"
  | "sinkFailure"
  | "diagnostic"
  | "check"
>;
export function sourceFrames(error: unknown): ErrorInfo["frames"] {
  if (!(error instanceof Error) || !error.stack) return [];
  const frames: ErrorInfo["frames"] = [];
  const heading = `${error.name}${error.message ? `: ${error.message}` : ""}`;
  if (!error.stack.startsWith(heading)) return [];
  // Strip the entire message, including any embedded newlines or forged frames.
  for (const line of error.stack.slice(heading.length).split("\n")) {
    const match = line.match(/(?:\(|\s)((?:file:\/\/)?\/[^()]+):(\d+):(\d+)\)?$/);
    if (!match) continue;
    const file = relative(process.cwd(), (match[1] ?? "").replace(/^file:\/\//, ""));
    const candidate = { file, line: Number(match[2]), column: Number(match[3]) };
    if (
      errorInfoSchema.shape.frames.element.safeParse(candidate).success &&
      existsSync(
        /*turbopackIgnore: true*/ resolve(/*turbopackIgnore: true*/ process.cwd(), file),
      ) &&
      !/src\/server\/(?:observability|database)\/(?:observability|observed-database|request-observability|provider-diagnostics|db|query)\.ts$/.test(
        file,
      )
    )
      frames.push(candidate);
    if (frames.length === 6) break;
  }
  return frames;
}
function navigation(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof error.digest === "string" &&
    /^(NEXT_REDIRECT;|NEXT_HTTP_ERROR_FALLBACK;)/.test(error.digest)
  );
}
const knownTypes = new Set<string>(errorInfoSchema.shape.type.options);
const codeSchema = errorInfoSchema.shape.code;
const digestSchema = errorInfoSchema.shape.digest;
// Drivers and fetch wrap the useful failure (for example ECONNRESET) in a generic error. Look a few
// levels down for an approved code only; the wrapped message and properties are never read.
function causeCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 3; depth++) {
    current =
      current && typeof current === "object" && "cause" in current ? current.cause : undefined;
    if (!current || typeof current !== "object") return undefined;
    const code = "code" in current ? current.code : undefined;
    if (typeof code === "string" && codeSchema.safeParse(code).success) return code;
  }
  return undefined;
}
function classify(error: unknown, boundary?: "database"): ErrorInfo {
  const ownCode = error && typeof error === "object" && "code" in error ? error.code : undefined;
  const rawCode = ownCode !== undefined ? ownCode : causeCode(error);
  const digest = digestSchema.safeParse(
    error && typeof error === "object" && "digest" in error ? error.digest : undefined,
  );
  const code = codeSchema.safeParse(rawCode);
  const name = error instanceof Error ? error.name : "UnknownError";
  const type: ErrorInfo["type"] =
    error instanceof ProjectError
      ? error.diagnosticType
      : rawCode === "DB_RESULT_INVALID"
        ? "DatabaseDecodeError"
        : typeof rawCode === "string" && /^(?:[0-9]{2}|P0|F0|HV|XX)[0-9A-Z]{3}$/.test(rawCode)
          ? "DatabaseError"
          : knownTypes.has(name)
            ? (name as ErrorInfo["type"])
            : "UnknownError";
  const category: ErrorInfo["category"] = navigation(error)
    ? "navigation"
    : error instanceof ProjectError
      ? error.diagnosticCategory
      : name === "ZodError"
        ? "rejected"
        : "unexpected";
  const diagnostic: Diagnostic =
    error instanceof DiagnosticError
      ? error.diagnostic
      : rawCode === "DB_RESULT_INVALID"
        ? { family: "contract", code: "DB_RESULT_INVALID", boundary: "database" }
        : boundary === "database" && (transportCodes as readonly unknown[]).includes(rawCode)
          ? {
              family: "database",
              code: "DATABASE_CONNECTION_FAILED",
              transportCode: rawCode as (typeof transportCodes)[number],
            }
          : type === "DatabaseError" && typeof rawCode === "string"
            ? { family: "database", code: "DATABASE_SQL_FAILED", sqlState: rawCode }
            : category === "navigation"
              ? { family: "backend", code: "FRAMEWORK_NAVIGATION" }
              : category === "conflict"
                ? { family: "backend", code: "REVISION_CONFLICT" }
                : name === "ZodError"
                  ? { family: "contract", code: "INPUT_INVALID", boundary: "input" }
                  : category === "rejected"
                    ? { family: "backend", code: "REQUEST_REJECTED" }
                    : boundary === "database"
                      ? { family: "database", code: "DATABASE_FAILED" }
                      : { family: "backend", code: "APPLICATION_FAILED" };
  const frames = sourceFrames(error);
  return {
    diagnostic,
    id: randomUUID(),
    category,
    type,
    ...(code.success && code.data ? { code: code.data } : {}),
    ...(digest.success && digest.data ? { digest: digest.data } : {}),
    frames,
    fingerprint: hash(JSON.stringify([diagnostic, type, code.success ? code.data : null, frames])),
  };
}

export { queryIdentity } from "@/server/database/query-identity";
export class BackendError extends Error {
  readonly errorId: string;
  readonly code?: string;
  constructor(info: ErrorInfo) {
    super("Unexpected backend failure.");
    this.name = "BackendError";
    this.errorId = info.id;
    if (info.code) this.code = info.code;
  }
}
export class Observability {
  private readonly storage = new AsyncLocalStorage<Context>();
  private readonly errors = new WeakMap<object, ErrorInfo>();
  private readonly instanceId = randomUUID();
  constructor(
    private readonly options: { write: (record: LogRecord) => void; level?: LogLevel | "silent" },
  ) {}
  context() {
    return this.storage.getStore();
  }
  run<T>(
    operation: OperationName,
    work: () => T,
    request?: { traceId?: string; route?: RouteName },
  ): T {
    const parent = this.context();
    const context: Context = {
      traceId:
        parent?.traceId ??
        (request?.traceId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.traceId)
          ? request.traceId
          : randomUUID()),
      spanId: randomUUID(),
      ...(parent ? { parentSpanId: parent.spanId } : {}),
      operation,
      route: parent?.route ?? request?.route ?? "unknown",
      stats: parent?.stats ?? { queryCount: 0, queryDurationMs: 0 },
    };
    return this.storage.run(context, work);
  }
  private invalidReportedAt = 0;
  private configurationReported = false;
  log(level: LogLevel, event: LogEvent, details: Details = {}) {
    if (ranks[level] < ranks[this.options.level ?? "info"]) return;
    try {
      const context = this.context();
      const environment =
        process.env.VERCEL_ENV === "production"
          ? "production"
          : process.env.VERCEL_ENV === "preview"
            ? "preview"
            : process.env.NODE_ENV === "test" || process.env.NODE_TEST_CONTEXT
              ? "test"
              : process.env.NODE_ENV === "production"
                ? "local"
                : "development";
      const candidateRelease = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NAKAMA_RELEASE;
      const release = /^[a-f0-9]{7,40}$/.test(candidateRelease ?? "") ? candidateRelease : "local";
      const traceId = context?.traceId ?? randomUUID();
      const spanId = context?.spanId ?? randomUUID();
      // Environment-derived identity is the only input a request cannot influence. When it is
      // malformed, drop it instead of losing every record.
      const compose = (
        trusted: boolean,
        recordLevel: LogLevel,
        recordEvent: LogEvent,
        extra: object,
      ) =>
        logRecordSchema.safeParse({
          ...(trusted && process.env.NAKAMA_BUILD_ID
            ? { buildId: process.env.NAKAMA_BUILD_ID }
            : {}),
          ...(trusted && process.env.VERCEL_DEPLOYMENT_ID
            ? { deploymentId: process.env.VERCEL_DEPLOYMENT_ID }
            : {}),
          version: 1,
          service: "nakama",
          timestamp: new Date().toISOString(),
          level: recordLevel,
          event: recordEvent,
          environment,
          release: trusted ? release : "local",
          instanceId: this.instanceId,
          traceId,
          spanId,
          ...(context?.parentSpanId ? { parentSpanId: context.parentSpanId } : {}),
          operation: context?.operation ?? "server.request",
          route: context?.route ?? "unknown",
          ...extra,
        });
      const record = compose(true, level, event, details);
      if (record.success) {
        this.options.write(record.data);
        return;
      }
      const repaired = compose(false, level, event, details);
      if (repaired.success) {
        this.options.write(repaired.data);
        if (!this.configurationReported) {
          this.configurationReported = true;
          this.diagnostic({
            family: "backend",
            code: "CONFIGURATION_INVALID",
            component: "build_metadata",
          });
        }
        return;
      }
      // The event itself is invalid. Say so, naming fields only, at most once a minute.
      if (Date.now() - this.invalidReportedAt < 60_000) return;
      this.invalidReportedAt = Date.now();
      const invalidFields = [
        ...new Set(
          record.error.issues
            .map((issue) => issue.path[0])
            .filter((field): field is string => typeof field === "string"),
        ),
      ]
        .filter((field) => /^[A-Za-z][A-Za-z0-9.]{0,39}$/.test(field))
        .slice(0, 8);
      const notice = compose(false, "warn", "logging.record_invalid", { invalidFields });
      if (notice.success) this.options.write(notice.data);
    } catch {
      /* Diagnostics must not change a request's outcome. */
    }
  }
  errorInfo(error: unknown, boundary?: "database"): ErrorInfo {
    if (error && typeof error === "object") {
      const previous = this.errors.get(error);
      if (previous) return previous;
      let info: ErrorInfo;
      try {
        info = classify(error, boundary);
      } catch {
        info = {
          id: randomUUID(),
          category: "unexpected",
          type: "UnknownError",
          diagnostic: { family: "backend", code: "APPLICATION_FAILED" },
          fingerprint: hash("uninspectable-error"),
          frames: [],
        };
      }
      this.errors.set(error, info);
      return info;
    }
    return classify(error, boundary);
  }
  diagnostic(diagnostic: Diagnostic, details: Pick<Details, "source"> = {}) {
    this.log(diagnosticCatalog[diagnostic.code].severity, "diagnostic", { diagnostic, ...details });
  }
  // Handled failures return `{ error }` instead of throwing. When the failure was unexpected, attach
  // its logged error ID so a person can report it. Rejections and conflicts get no reference.
  withReference<T>(result: T): T {
    const failure = this.context()?.stats.failure;
    if (
      failure?.category === "unexpected" &&
      result &&
      typeof result === "object" &&
      "error" in result &&
      typeof result.error === "string"
    )
      return { ...result, reference: failure.id };
    return result;
  }
  sanitizeError(error: unknown): unknown {
    const info = this.errorInfo(error);
    if (
      info.category === "navigation" ||
      error instanceof ProjectError ||
      error instanceof BackendError
    )
      return error;
    const safe = new BackendError(info);
    this.errors.set(safe, info);
    return safe;
  }
  reportError(error: unknown, event: LogEvent = "operation.error") {
    try {
      const info = this.errorInfo(error, event.startsWith("db.") ? "database" : undefined);
      if (info.category === "navigation") return info;
      const context = this.context();
      if (context) context.stats.failure = info;
      this.log(info.category === "unexpected" ? "error" : "info", event, { error: info });
      return info;
    } catch {
      return undefined;
    }
  }
  async observe<T>(
    operation: OperationName,
    work: () => Promise<T>,
    request?: { traceId?: string; route?: RouteName },
  ): Promise<T> {
    return this.run(
      operation,
      async () => {
        const started = performance.now();
        this.log("debug", "operation.start");
        let outcome: NonNullable<LogRecord["outcome"]> = "succeeded";
        try {
          const result = await work();
          if (typeof Response !== "undefined" && result instanceof Response && result.status >= 400)
            outcome = result.status >= 500 ? "failed" : "rejected";
          if (
            result &&
            typeof result === "object" &&
            "error" in result &&
            typeof result.error === "string"
          )
            outcome =
              this.context()?.stats.failure?.category === "unexpected" ? "failed" : "rejected";
          return result;
        } catch (error) {
          outcome = navigation(error)
            ? "navigation"
            : this.errorInfo(error).category === "unexpected"
              ? "failed"
              : "rejected";
          this.reportError(error);
          throw error;
        } finally {
          const stats = this.context()?.stats;
          const durationMs = Math.round((performance.now() - started) * 100) / 100;
          const quiet = operation.startsWith("notification.") || operation.startsWith("auth.");
          this.log(
            outcome === "failed" ? "error" : durationMs >= 1000 ? "warn" : quiet ? "debug" : "info",
            "operation.finish",
            {
              durationMs,
              outcome,
              queryCount: stats?.queryCount ?? 0,
              queryDurationMs: Math.round((stats?.queryDurationMs ?? 0) * 100) / 100,
              ...(stats?.failure ? { error: stats.failure } : {}),
            },
          );
        }
      },
      request,
    );
  }
}
function defaultSink() {
  let file: ReturnType<typeof rotatingFileSink> | undefined;
  let configurationFailed = false;
  // Never retain a user-supplied path or filesystem error in emitted diagnostics.
  try {
    const path = configuredLogFile();
    if (path) file = rotatingFileSink(path);
  } catch {
    configurationFailed = true;
  }
  let lastFailure = 0;
  return (record: LogRecord) => {
    const line = JSON.stringify(record);
    try {
      if (record.level === "error" || record.level === "warn") process.stderr.write(line + "\n");
      else process.stdout.write(line + "\n");
    } catch {
      /* logging transport failure */
    }
    try {
      if (configurationFailed) throw new Error();
      file?.(record);
    } catch (error) {
      if (Date.now() - lastFailure > 60_000) {
        lastFailure = Date.now();
        const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
        const sinkFailure = configurationFailed
          ? "configuration"
          : code === "LOG_FILE_BUSY"
            ? "busy"
            : code === "EACCES" || code === "EPERM"
              ? "denied"
              : code === "EROFS"
                ? "read_only"
                : code === "ENOSPC"
                  ? "disk_full"
                  : "unavailable";
        try {
          process.stderr.write(
            JSON.stringify({
              ...record,
              event: "logging.sink_error",
              level: "warn",
              diagnostic: {
                family: "compute",
                code: "LOG_STORAGE_FAILED",
                provider: "local",
                evidence: "filesystem",
              },
              error: undefined,
              queryId: undefined,
              source: undefined,
              sinkFailure,
            }) + "\n",
          );
        } catch {
          /* no recursive logging */
        }
      }
    }
  };
}
const configuredLevel = process.env.NAKAMA_LOG_LEVEL;
const level =
  configuredLevel && ["debug", "info", "warn", "error", "silent"].includes(configuredLevel)
    ? (configuredLevel as LogLevel | "silent")
    : process.env.NODE_TEST_CONTEXT
      ? "silent"
      : "info";
export const telemetry = new Observability({ write: defaultSink(), level });
