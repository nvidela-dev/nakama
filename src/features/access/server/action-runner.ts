import { observeAction } from "@/server/observability/request-observability";
import type { OperationName } from "@/server/observability/log-model";
import type { Actor } from "@/shared/contracts/actor";
import { actor, adminActor } from "./auth";

export function runAction<T>(
  operation: OperationName,
  work: (person: Actor) => Promise<T>,
  includeEmails = false,
) {
  return observeAction(operation, async () => work(await actor(includeEmails)));
}
export function runAdminAction<T>(operation: OperationName, work: (person: Actor) => Promise<T>) {
  return observeAction(operation, async () => work(await adminActor()));
}
