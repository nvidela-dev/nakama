import { diagnosticSchema, type Diagnostic } from "./diagnostics";

// Tool stderr is inspected transiently against fixed patterns, never retained or printed.
export function collectorDiagnostic(error: unknown): Diagnostic {
  let text = "", signal: unknown;
  try {
    if (error && typeof error === "object") {
      if ("stderr" in error) text += typeof error.stderr === "string" ? error.stderr.slice(0, 65536) : Buffer.isBuffer(error.stderr) ? error.stderr.subarray(0, 65536).toString("utf8") : "";
      if ("stdout" in error) text += typeof error.stdout === "string" ? error.stdout.slice(0, 65536) : Buffer.isBuffer(error.stdout) ? error.stdout.subarray(0, 65536).toString("utf8") : "";
      if ("signal" in error) signal = error.signal;
    }
  } catch { /* Hostile errors yield unknown cause. */ }
  const reason = /invalid_arguments/i.test(text) && /\b(?:time|range|window)\b/i.test(text) ? "invalid_time_window"
    : /invalid[_ -](?:(?:time|date)[_ -])?(?:range|window)/i.test(text) ? "invalid_time_window"
    : /team.owned|team-owned|teams only/i.test(text) ? "team_required"
    : /not logged|log in|login|credentials|\\b401\\b/i.test(text) ? "authentication"
      : /\\b403\\b|permission|access denied|not linked|isn.t linked/i.test(text) ? "project_access"
        : /unknown.*option|unknown.*command|unexpected.*argument/i.test(text) ? "unsupported_cli"
          : signal === "SIGTERM" ? "timeout" : "unknown";
  return diagnosticSchema.parse({ family: "dependency", code: reason === "authentication" || reason === "project_access" || reason === "team_required" || reason === "invalid_time_window" ? "DEPENDENCY_REJECTED" : reason === "timeout" ? "DEPENDENCY_UNAVAILABLE" : "DEPENDENCY_FAILED", provider: "vercel", operation: "logs.runtime", reason });
}
