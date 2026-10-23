import "server-only";
import { headers } from "next/headers";
import { z } from "zod";
import { telemetry } from "./observability";
import { routeName, type OperationName } from "./log-model";

async function requestContext() {
  try {
    const values = await headers();
    const trace = z.uuid().safeParse(values.get("x-nakama-request-id"));
    return { ...(trace.success ? { traceId: trace.data } : {}), route: routeName(values.get("x-nakama-route") ?? "") };
  } catch { return undefined; } // Build and CLI work have no HTTP context.
}
export async function observeAction<T>(operation: OperationName, work: () => Promise<T>): Promise<T> {
  try { return await telemetry.observe(operation, work, telemetry.context() ? undefined : await requestContext()); }
  catch (error) { throw telemetry.sanitizeError(error); }
}
export async function withRequestContext<T>(operation: OperationName, work: () => Promise<T>): Promise<T> {
  if (telemetry.context()) return work();
  return telemetry.run(operation, work, await requestContext());
}
