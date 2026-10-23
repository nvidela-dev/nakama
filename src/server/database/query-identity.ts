import { createHash } from "node:crypto";
import type { LogRecord } from "@/server/observability/log-model";
export function queryIdentity(sql: string): {
  queryId: string;
  queryKind: NonNullable<LogRecord["queryKind"]>;
} {
  const kind = sql.trim().split(/\s+/, 1)[0]?.toUpperCase();
  return {
    queryId: createHash("sha256")
      .update(sql.replace(/\s+/g, " ").trim())
      .digest("hex")
      .slice(0, 16),
    queryKind: [
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
      "WITH",
      "BEGIN",
      "COMMIT",
      "ROLLBACK",
    ].includes(kind ?? "")
      ? (kind as NonNullable<LogRecord["queryKind"]>)
      : "OTHER",
  };
}
