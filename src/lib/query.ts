import { DiagnosticError } from "./diagnostics";
import { queryIdentity } from "./query-identity";
import { z } from "zod";
import type { Queryable } from "./database";
export class DatabaseDecodeError extends DiagnosticError {
  readonly code = "DB_RESULT_INVALID";
  constructor(queryId?: string, violationCount?: number) {
    super({ family: "contract", code: "DB_RESULT_INVALID", boundary: "database", ...(queryId ? { queryId } : {}), ...(violationCount ? { violationCount } : {}) });
    this.message = "Database result does not match its declared schema.";
  }
}
// Raw driver rows are unknown; only a decoder may turn them into application data.
export async function queryRows<T>(
  tx: Queryable,
  schema: z.ZodType<T>,
  sql: string,
  values?: unknown[],
): Promise<T[]> {
  const result = await tx.query(sql, values);
  const parsed = z.array(schema).safeParse(result.rows);
  if (!parsed.success)
    throw new DatabaseDecodeError(queryIdentity(sql).queryId, parsed.error.issues.length);
  return parsed.data;
}
export { required } from "./required";
