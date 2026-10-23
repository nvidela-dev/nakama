import { z } from "zod";
import type { Queryable } from "./database";
// SQL projections still need an explicit decoder: a query<T> annotation cannot validate driver data.
export async function queryRows<T>(
  tx: Queryable,
  schema: z.ZodType<T>,
  sql: string,
  values?: unknown[],
): Promise<T[]> {
  const result = await tx.query<Record<string, unknown>>(sql, values);
  const parsed = z.array(schema).safeParse(result.rows);
  if (!parsed.success)
    throw new Error("Database result does not match its declared schema.");
  return parsed.data;
}
export function required<T>(
  value: T | null | undefined,
  message = "Expected data is missing.",
): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}
