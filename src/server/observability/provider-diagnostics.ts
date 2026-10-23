import { z } from "zod";
import {
  DiagnosticError,
  diagnosticSchema,
  transportCodes,
  type Diagnostic,
  type ProviderOperation,
} from "@/server/observability/diagnostics";

const metadata = z.object({
  status: z.number().int().min(100).max(599).optional(),
  clerkTraceId: z
    .string()
    .regex(/^[a-f0-9-]{16,80}$/i)
    .optional()
    .catch(undefined),
  retryAfter: z.number().finite().nonnegative().max(86400).optional().catch(undefined),
  code: z.string().optional(),
  errors: z
    .array(z.object({ code: z.string() }))
    .max(20)
    .optional()
    .catch(undefined),
});
const approved = new Set([
  "rate_limit_exceeded",
  "too_many_requests",
  "api_key_invalid",
  "resource_not_found",
  "form_identifier_exists",
  "internal_server_error",
]);
export function providerDiagnostic(error: unknown, operation: ProviderOperation): Diagnostic {
  let evidence: z.infer<typeof metadata> = {};
  try {
    evidence = metadata.parse(error);
  } catch {
    /* Unknown/hostile errors remain unknown, never serialized. */
  }
  const http = evidence.status;
  const transport = transportCodes.find((code) => code === evidence.code);
  const providerCode = evidence.errors?.[0]?.code;
  const code =
    http === 429
      ? "DEPENDENCY_RATE_LIMITED"
      : (http && http >= 500) || transport
        ? "DEPENDENCY_UNAVAILABLE"
        : http && http >= 400
          ? "DEPENDENCY_REJECTED"
          : "DEPENDENCY_FAILED";
  return diagnosticSchema.parse({
    family: "dependency",
    code,
    provider: "clerk",
    operation,
    ...(http ? { status: http } : {}),
    ...(transport ? { transportCode: transport } : {}),
    ...(evidence.clerkTraceId ? { requestId: evidence.clerkTraceId } : {}),
    ...(evidence.retryAfter !== undefined ? { retryAfterSeconds: evidence.retryAfter } : {}),
    ...(providerCode
      ? { providerCode: approved.has(providerCode) ? providerCode : "unknown" }
      : {}),
  });
}
export async function callClerk<T>(
  operation: ProviderOperation,
  work: () => Promise<T>,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    // Framework redirects/not-found from auth.protect must retain their control flow.
    if (error instanceof DiagnosticError) throw error;
    let navigation = false;
    try {
      navigation =
        !!error &&
        typeof error === "object" &&
        "digest" in error &&
        typeof error.digest === "string" &&
        /^(NEXT_REDIRECT;|NEXT_HTTP_ERROR_FALLBACK;)/.test(error.digest);
    } catch {
      /* untrusted getter */
    }
    if (navigation) throw error;
    throw new DiagnosticError(providerDiagnostic(error, operation));
  }
}
export function clerkResponse<T>(
  operation: ProviderOperation,
  schema: z.ZodType<T>,
  value: unknown,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new DiagnosticError({
      family: "contract",
      code: "PROVIDER_RESPONSE_INVALID",
      boundary: "clerk",
      operation,
    });
  return parsed.data;
}
const count = z.number().int().nonnegative();
export const allowlistPage = z.object({
  data: z.array(z.object({ id: z.string().min(1), identifier: z.string().min(1) })).max(100),
  totalCount: count,
});
export const waitlistPage = z.object({
  data: z
    .array(
      z.object({
        id: z.string().min(1),
        emailAddress: z.string().min(1),
        createdAt: z.number().finite(),
      }),
    )
    .max(100),
  totalCount: count,
});
export const usersPage = z.object({
  data: z
    .array(z.object({ emailAddresses: z.array(z.object({ emailAddress: z.string().min(1) })) }))
    .max(100),
  totalCount: count,
});
export function incompleteClerkPage(operation: ProviderOperation): never {
  throw new DiagnosticError({
    family: "contract",
    code: "PROVIDER_RESPONSE_INVALID",
    boundary: "clerk",
    operation,
  });
}

export const protectedIdentity = z.object({ userId: z.string().min(1) });
export const currentIdentity = z
  .object({
    fullName: z.string().nullable(),
    username: z.string().nullable(),
    primaryEmailAddress: z.object({ emailAddress: z.string() }).nullable(),
    emailAddresses: z.array(
      z.object({
        emailAddress: z.string(),
        verification: z.object({ status: z.string() }).nullable(),
      }),
    ),
  })
  .nullable();

// The footer also consumes the identity ID for its verified-administrator check.
export const currentIdentityWithId = currentIdentity
  .unwrap()
  .extend({ id: z.string().min(1) })
  .nullable();
