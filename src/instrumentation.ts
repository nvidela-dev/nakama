import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { telemetry } = await import("./lib/observability");
    telemetry.run("server.start", () => telemetry.log("info", "server.start"));
  }
}
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { telemetry } = await import("./lib/observability");
  const { routeName } = await import("./lib/log-model");
  const { z } = await import("zod");
  const trace = z.uuid().safeParse(request.headers["x-nakama-request-id"]);
  telemetry.run("server.request", () => telemetry.reportError(error, "server.error"), {
    ...(trace.success ? { traceId: trace.data } : {}), route: routeName(context.routePath),
  });
};
