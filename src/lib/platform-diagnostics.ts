import { heapExhausted, memoryDiagnostic } from "./process-diagnostics";
import { createHash } from "node:crypto";
import { z } from "zod";
import { diagnosticSchema, type Diagnostic } from "./diagnostics";
import { logRecordSchema, routeName, type LogRecord } from "./log-model";

const platform = z.object({
  timestamp: z.union([z.iso.datetime(), z.number().int().positive()]),
  level: z.enum(["error", "fatal", "warning", "info", "debug"]).optional(),
  isSystemLog: z.boolean().optional(), message: z.string().max(65536).optional(),
  errorCode: z.string().max(100).optional(), error_code: z.string().max(100).optional(),
  requestId: logRecordSchema.shape.platformRequestId,
  deploymentId: logRecordSchema.shape.deploymentId,
  environment: z.enum(["production", "preview"]),
  requestPath: z.string().max(4096).optional(),
});
const platformCodes = {
  FUNCTION_INVOCATION_TIMEOUT: "COMPUTE_TIMEOUT", EDGE_FUNCTION_INVOCATION_TIMEOUT: "COMPUTE_TIMEOUT",
  FUNCTION_INVOCATION_FAILED: "COMPUTE_INVOCATION_FAILED", EDGE_FUNCTION_INVOCATION_FAILED: "COMPUTE_INVOCATION_FAILED",
} as const;
export function platformDiagnostic(input: unknown): LogRecord | undefined {
  const parsed = platform.safeParse(input);
  if (!parsed.success) return undefined;
  const value = parsed.data;
  // Only explicit platform codes, or allowlisted tokens in system-produced logs.
  // Ordinary application messages cannot assert a compute failure.
  const token = value.errorCode ?? value.error_code ?? (value.isSystemLog ? value.message?.match(/\b(?:FUNCTION_INVOCATION_TIMEOUT|EDGE_FUNCTION_INVOCATION_TIMEOUT|FUNCTION_INVOCATION_FAILED|EDGE_FUNCTION_INVOCATION_FAILED)\b/)?.[0] : undefined);
  const platformCode = token && Object.hasOwn(platformCodes, token) ? token as keyof typeof platformCodes : undefined;
  const memory = value.isSystemLog && heapExhausted(value.message ?? "");
  if (!memory && !platformCode && !(value.isSystemLog && (value.level === "error" || value.level === "fatal"))) return undefined;
  const diagnostic: Diagnostic = diagnosticSchema.parse(memory ? memoryDiagnostic() : platformCode
    ? { family: "compute", code: platformCodes[platformCode], provider: "vercel", evidence: "platform_code", platformCode }
    : { family: "compute", code: "COMPUTE_FAILURE_UNKNOWN", provider: "vercel", evidence: "platform_event" });
  const timestamp = typeof value.timestamp === "number" ? new Date(value.timestamp).toISOString() : value.timestamp;
  const identity = createHash("sha256").update(JSON.stringify([timestamp, value.requestId, value.deploymentId, diagnostic])).digest("hex");
  const uuid = `${identity.slice(0, 8)}-${identity.slice(8, 12)}-4${identity.slice(13, 16)}-8${identity.slice(17, 20)}-${identity.slice(20, 32)}`;
  return logRecordSchema.parse({ version: 1, service: "nakama", timestamp, level: "error", event: "diagnostic", environment: value.environment,
    release: "unknown", instanceId: uuid, traceId: uuid, spanId: uuid, operation: "compute.hosting", route: routeName(value.requestPath ?? ""),
    ...(value.requestId ? { platformRequestId: value.requestId } : {}), ...(value.deploymentId ? { deploymentId: value.deploymentId } : {}), diagnostic });
}
