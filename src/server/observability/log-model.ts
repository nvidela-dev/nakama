import { z } from "zod";
import { diagnosticSchema, type Diagnostic } from "@/server/observability/diagnostics";

export const operationNames = [
  "project.navigation",
  "project.create",
  "project.edit",
  "project.delete",
  "project.link",
  "project.members.manage",
  "invitation.create",
  "invitation.accept",
  "artifact.create",
  "artifact.read",
  "artifact.change",
  "artifact.upload",
  "artifact.file",
  "task.change",
  "experiment.change",
  "experiment.read",
  "experiment.export",
  "task.import",
  "task.export",
  "comment.post",
  "comment.references",
  "comment.change",
  "flow.choose",
  "answer.save",
  "stage.review",
  "notification.unread",
  "notification.read",
  "admin.whitelist",
  "admin.access",
  "access.request",
  "preference.language",
  "preference.density",
  "preference.theme",
  "auth.actor",
  "auth.admin",
  "identity.whitelist.list",
  "identity.whitelist.add",
  "identity.whitelist.remove",
  "identity.requests.list",
  "identity.requests.create",
  "identity.requests.remove",
  "identity.candidates",
  "database.query",
  "database.transaction",
  "server.request",
  "server.start",
  "build.typecheck",
  "build.schema",
  "build.next",
  "compute.process",
  "compute.hosting",
  "diagnostics.collect",
] as const;
export type OperationName = (typeof operationNames)[number];
export const routeNames = [
  "/",
  "/preview",
  "/projects",
  "/projects/[projectId]",
  "/artifacts",
  "/projects/[projectId]/artifacts/[artifactId]",
  "/projects/[projectId]/artifacts/[artifactId]/files/[fileId]",
  "/admin",
  "/wiki",
  "/wiki/glossary",
  "/glossary",
  "/access-required",
  "/invitations/accept",
  "/sign-in",
  "/sign-up",
  "unknown",
] as const;
export type RouteName = (typeof routeNames)[number];
export function routeName(input: string): RouteName {
  const path = input.split(/[?#]/, 1)[0] ?? "";
  if ((routeNames as readonly string[]).includes(path)) return path as RouteName;
  if (/^\/projects\/[^/]+\/artifacts\/[^/]+\/files\/[^/]+\/?$/.test(path))
    return "/projects/[projectId]/artifacts/[artifactId]/files/[fileId]";
  if (/^\/projects\/[^/]+\/artifacts\/[^/]+\/?$/.test(path))
    return "/projects/[projectId]/artifacts/[artifactId]";
  if (/^\/projects\/[^/]+\/?$/.test(path)) return "/projects/[projectId]";
  if (/^\/sign-in(?:\/|$)/.test(path)) return "/sign-in";
  if (/^\/sign-up(?:\/|$)/.test(path)) return "/sign-up";
  return "unknown";
}
const duration = z.number().finite().nonnegative();
export const errorInfoSchema = z.object({
  id: z.uuid(),
  category: z.enum(["unexpected", "rejected", "conflict", "navigation"]),
  type: z.enum([
    "Error",
    "TypeError",
    "RangeError",
    "DatabaseError",
    "DatabaseDecodeError",
    "ProjectError",
    "ConflictError",
    "TaskConflictError",
    "ArtifactConflictError",
    "ZodError",
    "UnknownError",
  ]),
  code: z
    .string()
    .regex(
      /^(?:(?:[0-9]{2}|P0|F0|HV|XX)[0-9A-Z]{3}|DB_RESULT_INVALID|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EPIPE|EACCES|EPERM|ENOSPC|EROFS|EIO)$/,
    )
    .optional(),
  diagnostic: diagnosticSchema.optional(),
  // Next's opaque identifier for a rendering error; the framework creates it, so it carries no text.
  digest: z
    .string()
    .regex(/^[A-Za-z0-9_-]{4,40}$/)
    .optional(),
  fingerprint: z.string().regex(/^[a-f0-9]{16}$/),
  frames: z
    .array(
      z.object({
        file: z
          .string()
          .max(240)
          .refine((file) => !file.split("/").some((part) => part === "." || part === ".."))
          .regex(/^(?:src|scripts|tests|\.next)\/[A-Za-z0-9_./[\]()-]+\.(?:[cm]?js|tsx?)$/),
        line: z.number().int().positive(),
        column: z.number().int().positive(),
      }),
    )
    .max(6),
});
export type ErrorInfo = z.infer<typeof errorInfoSchema> & { diagnostic: Diagnostic };
export const logRecordSchema = z.object({
  version: z.literal(1),
  service: z.literal("nakama"),
  timestamp: z.iso.datetime(),
  level: z.enum(["debug", "info", "warn", "error"]),
  event: z.enum([
    "server.start",
    "server.error",
    "operation.start",
    "operation.finish",
    "operation.error",
    "db.query",
    "db.transaction",
    "db.pool_error",
    "db.rollback_error",
    "db.connection",
    "logging.sink_error",
    "logging.record_invalid",
    "diagnostic",
    "check.finish",
  ]),
  environment: z.enum(["local", "development", "test", "preview", "production"]),
  buildId: z
    .string()
    .regex(/^[a-f0-9]{16,64}$/)
    .optional(),
  deploymentId: z
    .string()
    .regex(/^dpl_[A-Za-z0-9]{10,80}$/)
    .optional(),
  platformRequestId: z
    .string()
    .regex(/^[A-Za-z0-9:|=-]{10,160}$/)
    .optional(),
  diagnostic: diagnosticSchema.optional(),
  check: z.enum(["typecheck", "schema", "build", "supervisor"]).optional(),
  release: z.string().regex(/^(?:[a-f0-9]{7,40}|local|unknown)$/),
  instanceId: z.uuid(),
  traceId: z.uuid(),
  spanId: z.uuid(),
  parentSpanId: z.uuid().optional(),
  operation: z.enum(operationNames),
  route: z.enum(routeNames),
  durationMs: duration.optional(),
  queryCount: z.number().int().nonnegative().optional(),
  queryDurationMs: duration.optional(),
  outcome: z
    .enum([
      "succeeded",
      "failed",
      "rejected",
      "navigation",
      "committed",
      "rolled_back",
      "commit_unknown",
      "rollback_failed",
    ])
    .optional(),
  queryId: z
    .string()
    .regex(/^[a-f0-9]{16}$/)
    .optional(),
  queryKind: z
    .enum(["SELECT", "INSERT", "UPDATE", "DELETE", "WITH", "BEGIN", "COMMIT", "ROLLBACK", "OTHER"])
    .optional(),
  rowCount: z.number().int().nonnegative().optional(),
  source: errorInfoSchema.shape.frames.element.optional(),
  error: errorInfoSchema.optional(),
  pool: z
    .object({
      total: z.number().int().nonnegative(),
      idle: z.number().int().nonnegative(),
      waiting: z.number().int().nonnegative(),
    })
    .optional(),
  sinkFailure: z
    .enum(["busy", "denied", "read_only", "disk_full", "configuration", "unavailable"])
    .optional(),
  // Field names (never values) that failed validation when a record had to be replaced.
  invalidFields: z
    .array(z.string().regex(/^[A-Za-z][A-Za-z0-9.]{0,39}$/))
    .max(8)
    .optional(),
});
export type LogRecord = z.infer<typeof logRecordSchema>;
export type LogLevel = LogRecord["level"];
export type LogEvent = LogRecord["event"];
