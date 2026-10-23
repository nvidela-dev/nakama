"use server";
import { observeAction } from "@/lib/request-observability";
import { telemetry } from "@/lib/observability";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { requestPolicy } from "@/lib/request-store";
import { ProjectError } from "@/lib/projects";
export type AccessEntryState = { error?: string; requested?: boolean; permittedEmail?: string };
// A bounded per-runtime guard supplements Clerk's own API limits. No raw IP is retained.
const buckets = new Map<string, { until: number; count: number }>();
export async function requestAccess(_state: AccessEntryState, data: FormData): Promise<AccessEntryState> {
  return observeAction("access.request", async () => {
    try {
      const requestHeaders = await headers();
      const source = requestHeaders.get("x-vercel-forwarded-for") || requestHeaders.get("x-forwarded-for") || "local";
      const key = createHash("sha256").update(source.split(",")[0] ?? "local").digest("hex");
      const now = Date.now();
      for (const [id, bucket] of buckets) if (bucket.until < now) buckets.delete(id);
      const bucket = buckets.get(key) ?? { until: now + 15 * 60_000, count: 0 };
      if (bucket.count >= 10 || (!buckets.has(key) && buckets.size >= 10000))
        throw new ProjectError("Too many access requests. Please try again later.");
      bucket.count++;
      buckets.set(key, bucket);
      const result = await requestPolicy().submit(String(data.get("email") ?? ""));
      return result.allowed ? { permittedEmail: result.email } : { requested: true };
    } catch (error) {
      telemetry.reportError(error);
      return { error: error instanceof ProjectError ? error.message : "Access requests are unavailable. Please try again later." };
    }
  });
}
