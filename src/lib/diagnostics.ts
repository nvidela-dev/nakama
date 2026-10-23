import { z } from "zod";

const status = z.number().int().min(100).max(599);
export const transportCodes = ["ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EPIPE"] as const;
export const providerOperations = ["middleware", "client", "auth.protect", "user.current", "allowlist.list", "allowlist.create", "allowlist.delete", "waitlist.list", "waitlist.create", "waitlist.delete", "users.list"] as const;
export type ProviderOperation = typeof providerOperations[number];
const provider = { status: status.optional(), requestId: z.string().regex(/^[a-f0-9-]{16,80}$/i).optional(), retryAfterSeconds: z.number().finite().nonnegative().max(86400).optional(), providerCode: z.enum(["rate_limit_exceeded", "too_many_requests", "api_key_invalid", "resource_not_found", "form_identifier_exists", "internal_server_error", "unknown"]).optional(), transportCode: z.enum(transportCodes).optional() };
const sqlState = z.string().regex(/^(?:[0-9]{2}|P0|F0|HV|XX)[0-9A-Z]{3}$/);
export const diagnosticSchema = z.discriminatedUnion("family", [
  z.object({ family: z.literal("type"), code: z.literal("TYPESCRIPT_COMPILE_FAILED"), compilerCode: z.number().int().positive(), phase: z.enum(["config", "compile"]) }),
  z.discriminatedUnion("code", [
    z.object({ family: z.literal("build"), code: z.literal("SCHEMA_CHECK_FAILED"), tool: z.literal("schema") }),
    z.object({ family: z.literal("build"), code: z.literal("BUILD_FAILED"), tool: z.literal("next") }),
  ]),
  z.discriminatedUnion("code", [
    z.object({ family: z.literal("contract"), code: z.literal("DB_RESULT_INVALID"), boundary: z.literal("database"), queryId: z.string().regex(/^[a-f0-9]{16}$/).optional(), violationCount: z.number().int().positive().optional() }),
    z.object({ family: z.literal("contract"), code: z.literal("PROVIDER_RESPONSE_INVALID"), boundary: z.literal("clerk"), operation: z.enum(providerOperations) }),
    z.object({ family: z.literal("contract"), code: z.literal("INPUT_INVALID"), boundary: z.literal("input") }),
  ]),
  z.discriminatedUnion("code", [
    z.object({ family: z.literal("backend"), code: z.enum(["APPLICATION_FAILED", "REQUEST_REJECTED", "REVISION_CONFLICT", "FRAMEWORK_NAVIGATION"]) }),
    z.object({ family: z.literal("backend"), code: z.literal("CONFIGURATION_INVALID"), component: z.enum(["database", "build_metadata"]) }),
  ]),
  z.discriminatedUnion("code", [
    z.object({ family: z.literal("database"), code: z.literal("DATABASE_FAILED") }),
    z.object({ family: z.literal("database"), code: z.literal("DATABASE_SQL_FAILED"), sqlState }),
    z.object({ family: z.literal("database"), code: z.literal("DATABASE_CONNECTION_FAILED"), transportCode: z.enum(transportCodes) }),
  ]),
  z.discriminatedUnion("provider", [
    z.object({ family: z.literal("dependency"), code: z.enum(["DEPENDENCY_RATE_LIMITED", "DEPENDENCY_UNAVAILABLE", "DEPENDENCY_REJECTED", "DEPENDENCY_FAILED"]), provider: z.literal("clerk"), operation: z.enum(providerOperations), ...provider }),
    z.object({ family: z.literal("dependency"), code: z.enum(["DEPENDENCY_REJECTED", "DEPENDENCY_FAILED", "DEPENDENCY_UNAVAILABLE"]), provider: z.literal("vercel"), operation: z.literal("logs.runtime"), reason: z.enum(["authentication", "project_access", "team_required", "unsupported_cli", "invalid_time_window", "timeout", "unknown"]), ...provider }),
  ]),
  z.discriminatedUnion("code", [
    z.object({ family: z.literal("compute"), code: z.literal("COMPUTE_TIMEOUT"), provider: z.literal("vercel"), evidence: z.literal("platform_code"), platformCode: z.enum(["FUNCTION_INVOCATION_TIMEOUT", "EDGE_FUNCTION_INVOCATION_TIMEOUT"]) }),
    z.object({ family: z.literal("compute"), code: z.literal("COMPUTE_MEMORY_EXCEEDED"), provider: z.literal("node"), evidence: z.literal("runtime_fatal"), runtimeCode: z.literal("V8_HEAP_OUT_OF_MEMORY") }),
    z.object({ family: z.literal("compute"), code: z.literal("COMPUTE_INVOCATION_FAILED"), provider: z.literal("vercel"), evidence: z.literal("platform_code"), platformCode: z.enum(["FUNCTION_INVOCATION_FAILED", "EDGE_FUNCTION_INVOCATION_FAILED"]) }),
    z.object({ family: z.literal("compute"), code: z.literal("COMPUTE_FAILURE_UNKNOWN"), provider: z.literal("vercel"), evidence: z.literal("platform_event") }),
    z.object({ family: z.literal("compute"), code: z.literal("PROCESS_EXITED"), provider: z.literal("local"), evidence: z.literal("supervisor_exit"), exitCode: z.number().int().min(0).max(255).optional(), signal: z.enum(["SIGABRT", "SIGKILL", "SIGSEGV", "SIGTERM", "SIGINT", "SIGBUS", "SIGILL", "SIGQUIT", "SIGFPE", "SIGTRAP", "SIGXCPU", "SIGXFSZ", "unknown"]).optional() }).refine(v => v.exitCode !== undefined || v.signal !== undefined),
    z.object({ family: z.literal("compute"), code: z.literal("LOG_STORAGE_FAILED"), provider: z.literal("local"), evidence: z.literal("filesystem") }),
  ]),
]);
export type Diagnostic = z.infer<typeof diagnosticSchema>;
export type DiagnosticCode = Diagnostic["code"];
export type DiagnosticFamily = Diagnostic["family"];
type Guidance = { title: string; severity: "info" | "error" | "warn"; retry: "never" | "review"; check: string };
// Exhaustive: adding a diagnostic code requires an explicit explanation and retry policy.
export const diagnosticCatalog = {
  TYPESCRIPT_COMPILE_FAILED: { title: "TypeScript compilation failed", severity: "error", retry: "never", check: "Open the compiler code and source location; run npm run typecheck:explain for the full local compiler explanation. No source text is stored in diagnostics." },
  SCHEMA_CHECK_FAILED: { title: "Storage schema/type check failed", severity: "error", retry: "never", check: "Run npm run db:check; regenerate storage types from reviewed migrations and inspect the diff." },
  BUILD_FAILED: { title: "Application build failed", severity: "error", retry: "review", check: "Inspect preceding compiler diagnostics and reproduce npm run build locally. A failed build alone does not establish a code, network, or memory cause." },
  DB_RESULT_INVALID: { title: "Database result violated its contract", severity: "error", retry: "never", check: "A query result failed its decoder. Inspect its source frame and recent SQL/schema changes." },
  PROVIDER_RESPONSE_INVALID: { title: "Service response violated its contract", severity: "error", retry: "never", check: "Compare the Clerk adapter decoder with the installed SDK and provider response contract; never log the response body." },
  INPUT_INVALID: { title: "Input validation rejected a request", severity: "info", retry: "never", check: "Inspect the input validator and its caller; preserve the user's existing validation feedback." },
  CONFIGURATION_INVALID: { title: "Required server configuration is invalid", severity: "error", retry: "never", check: "Check the named configuration component without printing its values. Restore the matching build metadata or configured database connection." },
  APPLICATION_FAILED: { title: "Unexpected application failure", severity: "error", retry: "review", check: "Follow the trace and matching build source. The cause is unknown until the evidence establishes it." },
  REQUEST_REJECTED: { title: "Request rejected by application policy", severity: "info", retry: "never", check: "Inspect policy/input checks; rejection does not imply infrastructure failure." },
  REVISION_CONFLICT: { title: "Concurrent edit conflict", severity: "info", retry: "never", check: "Reload current state and preserve the draft. Do not overwrite or automatically replay the write." },
  FRAMEWORK_NAVIGATION: { title: "Framework navigation", severity: "info", retry: "never", check: "Redirect/not-found control flow is not an application failure." },
  DATABASE_FAILED: { title: "Database driver failed with unknown cause", severity: "error", retry: "review", check: "Inspect the query/connection source and matching transaction. The driver supplied no approved SQLSTATE or transport evidence; do not infer an outage or replay writes." },
  DATABASE_SQL_FAILED: { title: "Database rejected or interrupted a statement", severity: "error", retry: "review", check: "Inspect SQLSTATE, query fingerprint, and transaction outcome. Check constraints, lock order, or query cancellation. Never replay an ambiguous commit." },
  DATABASE_CONNECTION_FAILED: { title: "Database connection failed", severity: "error", retry: "review", check: "Check database availability and pool lifecycle. Resolve commit_unknown or rollback_failed before considering any replay." },
  DEPENDENCY_RATE_LIMITED: { title: "External service rate limited the operation", severity: "error", retry: "review", check: "Check provider operation, request ID, and Retry-After. Verify idempotency before retrying; no automatic write retries." },
  DEPENDENCY_UNAVAILABLE: { title: "External service unavailable", severity: "error", retry: "review", check: "Check provider status, transport code, and trace timings; a lost response does not establish that a write failed." },
  DEPENDENCY_REJECTED: { title: "External service rejected the operation", severity: "error", retry: "never", check: "Check HTTP status and allowlisted provider code; verify credentials, permission, or request contract without exposing secrets." },
  DEPENDENCY_FAILED: { title: "External service failed with unknown cause", severity: "error", retry: "review", check: "Use the provider operation and request ID to investigate. Missing status is not evidence of an outage." },
  COMPUTE_TIMEOUT: { title: "Hosting platform reported a timeout", severity: "error", retry: "review", check: "Compare the hosting request with operation/query durations; inspect stalled dependencies and execution limits. Commit status may be unknown." },
  COMPUTE_MEMORY_EXCEEDED: { title: "Node runtime reported heap exhaustion", severity: "error", retry: "review", check: "Inspect heap limits, payload bounds and concurrency for the matching build. Do not infer memory exhaustion from SIGKILL alone." },
  COMPUTE_INVOCATION_FAILED: { title: "Hosting invocation failed", severity: "error", retry: "review", check: "Cause is unknown: correlate hosting request/deployment with application traces. This platform code alone does not prove a crash or memory exhaustion." },
  COMPUTE_FAILURE_UNKNOWN: { title: "Hosting platform reported an unclassified failure", severity: "error", retry: "review", check: "Correlate the hosting request/deployment with application diagnostics. No specific timeout, memory, or crash cause was supplied." },
  PROCESS_EXITED: { title: "Supervised process exited abnormally", severity: "error", retry: "review", check: "Inspect exit code/signal and preceding diagnostics. SIGKILL alone cannot distinguish a manual kill from memory pressure." },
  LOG_STORAGE_FAILED: { title: "Local diagnostic storage failed", severity: "warn", retry: "review", check: "Check disk capacity, permissions and sink warnings; stdout may retain records absent from the file." },
} as const satisfies Record<DiagnosticCode, Guidance>;

export class DiagnosticError extends Error {
  readonly diagnostic: Diagnostic;
  constructor(diagnostic: Diagnostic) {
    super(diagnosticCatalog[diagnostic.code].title);
    this.name = "DiagnosticError";
    this.diagnostic = diagnosticSchema.parse(diagnostic);
  }
}
