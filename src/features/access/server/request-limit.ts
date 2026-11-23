import { createHash } from "node:crypto";
import { ProjectError } from "@/shared/contracts/errors";
// A bounded per-runtime guard supplements Clerk's own API limits. No raw IP is retained.
const buckets = new Map<string, { until: number; count: number }>();

export function checkRequestLimit(source: string) {
  const key = createHash("sha256")
    .update(source.split(",")[0] ?? "local")
    .digest("hex");
  const now = Date.now();
  for (const [id, bucket] of buckets) if (bucket.until < now) buckets.delete(id);
  const bucket = buckets.get(key) ?? { until: now + 15 * 60_000, count: 0 };
  if (bucket.count >= 10 || (!buckets.has(key) && buckets.size >= 10000))
    throw new ProjectError("Too many access requests. Please try again later.");
  bucket.count++;
  buckets.set(key, bucket);
}
