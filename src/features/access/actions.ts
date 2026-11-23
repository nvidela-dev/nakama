"use server";
import { observeAction } from "@/server/observability/request-observability";
import { telemetry } from "@/server/observability/observability";

import { checkRequestLimit } from "./server/request-limit";
import { headers } from "next/headers";
import { requestPolicy } from "@/features/access/server/request-store";
import { ProjectError } from "@/shared/contracts/errors";
export type AccessEntryState = { error?: string; requested?: boolean; permittedEmail?: string };
export async function requestAccess(
  _state: AccessEntryState,
  data: FormData,
): Promise<AccessEntryState> {
  return observeAction("access.request", async () => {
    try {
      const requestHeaders = await headers();
      const source =
        requestHeaders.get("x-vercel-forwarded-for") ||
        requestHeaders.get("x-forwarded-for") ||
        "local";
      checkRequestLimit(source);
      const result = await requestPolicy().submit(String(data.get("email") ?? ""));
      return result.allowed ? { permittedEmail: result.email } : { requested: true };
    } catch (error) {
      telemetry.reportError(error);
      return {
        error:
          error instanceof ProjectError
            ? error.message
            : "Access requests are unavailable. Please try again later.",
      };
    }
  });
}
