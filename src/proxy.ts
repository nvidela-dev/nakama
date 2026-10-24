import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { callClerk } from "@/server/observability/provider-diagnostics";
import { telemetry } from "@/server/observability/observability";
import { routeName } from "@/server/observability/log-model";
function tracedNext(request: NextRequest) {
  // Inside the observed middleware call this is that operation's trace, so a middleware failure
  // and the downstream request it forwards share one ID. Outside it (no Clerk), mint a new one.
  const traceId = telemetry.context()?.traceId ?? crypto.randomUUID();
  const values = new Headers(request.headers);
  // Replace caller-supplied context; never forward private IDs or query strings.
  values.set("x-nakama-request-id", traceId);
  values.set("x-nakama-route", routeName(request.nextUrl.pathname));
  const response = NextResponse.next({ request: { headers: values } });
  response.headers.set("x-nakama-request-id", traceId);
  return response;
}
const clerk = clerkMiddleware((_auth, request) => tracedNext(request));
export default function proxy(request: NextRequest, event: Parameters<typeof clerk>[1]) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    if (
      request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/artifacts") ||
      request.nextUrl.pathname.startsWith("/projects") ||
      request.nextUrl.pathname.startsWith("/invitations")
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return tracedNext(request);
  }
  return telemetry
    .observe("server.request", () => callClerk("middleware", async () => clerk(request, event)), {
      route: routeName(request.nextUrl.pathname),
    })
    .catch((error) => {
      throw telemetry.sanitizeError(error);
    });
}
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
