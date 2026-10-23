import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { collectorDiagnostic } from "../src/server/observability/collector-diagnostics";
import {
  heapExhausted,
  processExitDiagnostic,
} from "../src/server/observability/process-diagnostics";
import { execFileSync, spawn } from "node:child_process";
import { z } from "zod";
import {
  diagnosticCatalog,
  diagnosticSchema,
  DiagnosticError,
  type Diagnostic,
} from "../src/server/observability/diagnostics";
import { Observability } from "../src/server/observability/observability";
import {
  providerDiagnostic,
  callClerk,
  clerkResponse,
  currentIdentity,
} from "../src/server/observability/provider-diagnostics";
import {
  parseLogLines,
  diagnosticEntries,
  summarizeDiagnostics,
} from "../src/server/observability/log-reader";
import { platformDiagnostic } from "../src/server/observability/platform-diagnostics";
import { symbolicate } from "../src/server/observability/log-symbolication";
import { logRecordSchema, type LogRecord } from "../src/server/observability/log-model";
import { observedDatabase } from "../src/server/database/observed-database";
import type { Database } from "../src/server/database/database";
const fixture = () => {
  const records: LogRecord[] = [];
  return { records, logger: new Observability({ write: (r) => records.push(r), level: "debug" }) };
};

test("diagnostic families require their evidence and exhaustive catalog explains every emitted code", () => {
  assert.equal(
    diagnosticSchema.safeParse({ family: "type", code: "TYPESCRIPT_COMPILE_FAILED" }).success,
    false,
  );
  assert.equal(
    diagnosticSchema.safeParse({ family: "dependency", code: "DEPENDENCY_FAILED" }).success,
    false,
  );
  assert.equal(
    diagnosticSchema.safeParse({ family: "compute", code: "COMPUTE_TIMEOUT" }).success,
    false,
  );
  for (const guidance of Object.values(diagnosticCatalog)) {
    assert.ok(guidance.check.length > 20);
    assert.ok(["never", "review"].includes(guidance.retry));
  }
  // Compile-time contracts: adding a family must still supply its mandatory evidence.
  // @ts-expect-error compiler failures require compilerCode and phase
  const bad: Diagnostic = { family: "type", code: "TYPESCRIPT_COMPILE_FAILED" };
  void bad;
  const wrongBoundary: Diagnostic = {
    family: "contract",
    code: "DB_RESULT_INVALID",
    // @ts-expect-error a database decoder failure cannot claim an input boundary
    boundary: "input",
  };
  void wrongBoundary;
  // @ts-expect-error a hosting timeout requires an explicit platform code
  const noEvidence: Diagnostic = {
    family: "compute",
    code: "COMPUTE_TIMEOUT",
    provider: "vercel",
    evidence: "platform_code",
  };
  void noEvidence;
});

test("Clerk adapters preserve safe failure evidence and discard private bodies and unknown codes", async () => {
  const secret = "PRIVATE@example.invalid_token_project";
  const error = Object.assign(new Error(secret), {
    status: 429,
    clerkTraceId: "abcdef0123456789abcdef0123456789",
    retryAfter: 12,
    errors: [{ code: "rate_limit_exceeded", message: secret, meta: secret }],
    headers: { authorization: secret },
    cause: secret,
  });
  const { records, logger } = fixture();
  await assert.rejects(
    logger.observe("identity.whitelist.add", () =>
      callClerk("allowlist.create", async () => {
        throw error;
      }),
    ),
  );
  const entry = diagnosticEntries(records)[0]!;
  assert.equal(entry.diagnostic.code, "DEPENDENCY_RATE_LIMITED");
  assert.equal(entry.diagnostic.family, "dependency");
  if (entry.diagnostic.family === "dependency") {
    assert.equal(entry.diagnostic.status, 429);
    assert.equal(entry.diagnostic.retryAfterSeconds, 12);
    assert.equal(entry.diagnostic.requestId, error.clerkTraceId);
  }
  assert.ok(!JSON.stringify(records).includes(secret));
  assert.equal(providerDiagnostic({ status: 503 }, "users.list").code, "DEPENDENCY_UNAVAILABLE");
  assert.equal(providerDiagnostic({ status: 403 }, "users.list").code, "DEPENDENCY_REJECTED");
  assert.equal(
    providerDiagnostic({ code: "ECONNRESET" }, "users.list").code,
    "DEPENDENCY_UNAVAILABLE",
  );
  assert.equal(providerDiagnostic(new Error(secret), "users.list").code, "DEPENDENCY_FAILED");
  assert.ok(
    !JSON.stringify(
      providerDiagnostic(
        { status: 400, clerkTraceId: secret, errors: [{ code: secret }] },
        "users.list",
      ),
    ).includes(secret),
  );
  const hostile = Object.defineProperty({}, "status", {
    get() {
      throw new Error(secret);
    },
  });
  assert.doesNotThrow(() => providerDiagnostic(hostile, "users.list"));
});

test("provider contracts fail separately from input errors and preserve framework navigation", async () => {
  assert.throws(
    () => clerkResponse("users.list", z.object({ id: z.string() }), { id: 42, private: "PRIVATE" }),
    (e) => e instanceof DiagnosticError && e.diagnostic.code === "PROVIDER_RESPONSE_INVALID",
  );
  assert.doesNotThrow(() =>
    clerkResponse("user.current", currentIdentity, {
      fullName: null,
      username: null,
      primaryEmailAddress: null,
      emailAddresses: [],
    }),
  );
  const navigation = Object.assign(new Error("PRIVATE"), {
    digest: "NEXT_REDIRECT;replace;/private;307;",
  });
  await assert.rejects(
    callClerk("auth.protect", async () => {
      throw navigation;
    }),
    (e) => e === navigation,
  );
  const { logger } = fixture();
  assert.equal(logger.errorInfo(new TypeError("PRIVATE")).diagnostic.family, "backend");
  const validation = z.string().safeParse(1);
  if (!validation.success)
    assert.equal(logger.errorInfo(validation.error).diagnostic.code, "INPUT_INVALID");
});

test("database transport failures keep boundary and opaque identity through action sanitation", async () => {
  const { logger, records } = fixture();
  const base: Database = {
    query: async () => {
      throw Object.assign(new Error("PRIVATE"), { code: "ECONNRESET" });
    },
    transaction: async (work) => work(base),
  };
  await assert.rejects(
    logger.observe("project.create", () =>
      observedDatabase(base, logger).transaction((tx) =>
        tx.query("INSERT INTO test VALUES($1)", ["PRIVATE"]),
      ),
    ),
  );
  const entries = diagnosticEntries(records);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.diagnostic.code, "DATABASE_CONNECTION_FAILED");
  assert.deepEqual(entries[0]?.transactionOutcomes, ["rolled_back"]);
});

test("hosting import requires explicit evidence, strips private context, and deduplicates", () => {
  const input = {
    timestamp: "2026-10-23T12:00:00.000Z",
    environment: "production",
    deploymentId: "dpl_1234567890abcdefgh",
    requestId: "iad1::abcdefghij123456",
    isSystemLog: true,
    message: "FUNCTION_INVOCATION_TIMEOUT PRIVATE",
    requestPath: "/projects/PRIVATE?token=PRIVATE",
    headers: "PRIVATE",
  };
  // Real request IDs contain colons; retain correlation without paths or tokens.
  const record = platformDiagnostic(input)!;
  assert.ok(record);
  assert.equal(record.diagnostic?.code, "COMPUTE_TIMEOUT");
  assert.equal(record.release, "unknown");
  assert.equal(record.route, "/projects/[projectId]");
  assert.ok(!JSON.stringify(record).includes("PRIVATE"));
  assert.equal(platformDiagnostic({ ...input, isSystemLog: false }), undefined);
  assert.equal(platformDiagnostic({ ...input, message: "SIGKILL PRIVATE" }), undefined);
  assert.equal(
    platformDiagnostic({ ...input, message: "FUNCTION_INVOCATION_FAILED" })?.diagnostic?.code,
    "COMPUTE_INVOCATION_FAILED",
  );
  assert.equal(
    platformDiagnostic({
      ...input,
      message: "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory",
    })?.diagnostic?.code,
    "COMPUTE_MEMORY_EXCEEDED",
  );
  const lines = [input, input].map((data) => JSON.stringify({ type: "log", data })).join("\n");
  const parsed = parseLogLines(lines);
  assert.equal(parsed.records.length, 2);
  assert.equal(diagnosticEntries(parsed.records).length, 1);
  assert.equal(platformDiagnostic({ ...input, timestamp: "not-a-date" }), undefined);
});

test("compiler failures become safe, located, machine-readable events and exit nonzero", () => {
  const folder = mkdtempSync(join(tmpdir(), "nakama-compiler-"));
  try {
    mkdirSync(join(folder, "src"));
    writeFileSync(
      join(folder, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { strict: true, types: [], skipLibCheck: true },
        files: ["src/broken.ts"],
      }),
    );
    writeFileSync(
      join(folder, "src/broken.ts"),
      'const value: number = "PRIVATE_TOKEN_IN_SOURCE";\n',
    );
    const args = [
      "--import",
      resolve("node_modules/tsx/dist/loader.mjs"),
      resolve("scripts/typecheck.ts"),
    ];
    let status: number | undefined;
    try {
      execFileSync(process.execPath, args, {
        cwd: folder,
        env: {
          ...process.env,
          NODE_TEST_CONTEXT: "",
          TSX_TSCONFIG_PATH: resolve("tsconfig.json"),
          NAKAMA_LOG_LEVEL: "info",
          NAKAMA_LOG_FILE: join(folder, "checks.jsonl"),
        },
        stdio: "pipe",
      });
    } catch (e) {
      status = (e as { status: number }).status;
    }
    assert.equal(status, 1);
    const text = readFileSync(join(folder, "checks.jsonl"), "utf8");
    assert.ok(!text.includes("PRIVATE_TOKEN_IN_SOURCE"));
    const records = parseLogLines(text).records;
    const entries = diagnosticEntries(records);
    assert.ok(
      entries.some(
        (e) =>
          e.diagnostic.family === "type" &&
          e.diagnostic.compilerCode === 2322 &&
          e.source?.file === "src/broken.ts" &&
          e.source.line === 1,
      ),
    );
    assert.equal(records.at(-1)?.outcome, "failed");
    writeFileSync(join(folder, "src/broken.ts"), "const value: number = 1;\n");
    assert.doesNotThrow(() =>
      execFileSync(process.execPath, args, {
        cwd: folder,
        env: {
          ...process.env,
          NODE_TEST_CONTEXT: "",
          TSX_TSCONFIG_PATH: resolve("tsconfig.json"),
          NAKAMA_LOG_LEVEL: "info",
          NAKAMA_LOG_FILE: join(folder, "checks.jsonl"),
        },
        stdio: "pipe",
      }),
    );
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("source maps require the matching build and never emit embedded source or unsafe paths", () => {
  const folder = mkdtempSync(join(tmpdir(), "nakama-map-"));
  try {
    const buildId = "a".repeat(32);
    writeFileSync(join(folder, "BUILD_ID"), buildId);
    mkdirSync(join(folder, "server"));
    writeFileSync(
      join(folder, "server/chunk.js.map"),
      JSON.stringify({
        version: 3,
        sources: ["turbopack:///[project]/src/features/projects/server/projects.ts"],
        sourcesContent: ["PRIVATE"],
        names: [],
        mappings: "AAAA",
      }),
    );
    const { logger, records } = fixture();
    logger.log("info", "server.start");
    const record = {
      ...records[0]!,
      buildId,
      source: { file: ".next/server/chunk.js", line: 1, column: 1 },
    };
    assert.deepEqual(symbolicate(record, folder), {
      status: "mapped",
      source: { file: "src/features/projects/server/projects.ts", line: 1, column: 1 },
    });
    writeFileSync(
      join(folder, "server/chunk.js.map"),
      JSON.stringify({
        version: 3,
        sources: [resolve("src/features/projects/server/projects.ts")],
        names: [],
        mappings: "AAAA",
      }),
    );
    assert.equal(symbolicate(record, folder).status, "mapped");
    assert.equal(
      symbolicate({ ...record, buildId: "b".repeat(32) }, folder).status,
      "build_mismatch",
    );
    assert.equal(
      logRecordSchema.safeParse({
        ...record,
        source: { file: "src/../../PRIVATE.ts", line: 1, column: 1 },
      }).success,
      false,
    );
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("diagnostic CLI filters families, explains safe next steps and reads CI records", () => {
  const folder = mkdtempSync(join(tmpdir(), "nakama-doctor-"));
  try {
    const { logger, records } = fixture();
    logger.run("build.typecheck", () =>
      logger.diagnostic({
        family: "type",
        code: "TYPESCRIPT_COMPILE_FAILED",
        compilerCode: 2322,
        phase: "compile",
      }),
    );
    logger.reportError(
      new DiagnosticError({
        family: "dependency",
        code: "DEPENDENCY_RATE_LIMITED",
        provider: "clerk",
        operation: "users.list",
        status: 429,
      }),
    );
    const file = join(folder, "checks.jsonl");
    writeFileSync(file, records.map((r) => JSON.stringify(r)).join("\n"));
    const output = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/logs.ts",
        "diagnostics",
        "--family",
        "type",
        "--file",
        file,
        "--json",
      ],
      { encoding: "utf8" },
    );
    const report = JSON.parse(output) as ReturnType<typeof summarizeDiagnostics>;
    assert.equal(report.entries.length, 1);
    assert.equal(report.entries[0]?.diagnostic.family, "type");
    assert.ok(report.entries[0]?.guidance.check.includes("compiler"));
    assert.ok(report.coverage.includes("Missing events"));
    assert.equal(summarizeDiagnostics(records).total, 2);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("external supervision records real process termination without guessing memory exhaustion", async () => {
  const child = spawn(process.execPath, ["-e", "process.kill(process.pid, 'SIGKILL')"], {
    stdio: "ignore",
  });
  const result = await new Promise<{ code: number | null; signal: string | null }>((resolve) =>
    child.once("exit", (code, signal) => resolve({ code, signal })),
  );
  const diagnostic = processExitDiagnostic(result.code, result.signal);
  assert.equal(diagnostic?.code, "PROCESS_EXITED");
  assert.equal(diagnostic?.family === "compute" ? diagnostic.signal : undefined, "SIGKILL");
  assert.equal(processExitDiagnostic(0, null), undefined);
  assert.equal(processExitDiagnostic(null, "SIGTERM"), undefined);
  assert.equal(processExitDiagnostic(7, null)?.code, "PROCESS_EXITED");
});

test("collector failures are catalogued without retaining CLI output", () => {
  const diagnostic = collectorDiagnostic({
    stderr: "PRIVATE-token No existing credentials found. Run login PRIVATE-project",
    stdout: "PRIVATE@example.invalid",
  });
  assert.equal(diagnostic.code, "DEPENDENCY_REJECTED");
  assert.equal(
    diagnostic.family === "dependency" && diagnostic.provider === "vercel"
      ? diagnostic.reason
      : undefined,
    "authentication",
  );
  assert.ok(!JSON.stringify(diagnostic).includes("PRIVATE"));
  assert.equal(
    collectorDiagnostic({ stderr: "Team-owned projects only" }).code,
    "DEPENDENCY_REJECTED",
  );
  assert.equal(
    collectorDiagnostic({ stderr: Buffer.from('{"reason":"invalid_range","private":"PRIVATE"}') })
      .code,
    "DEPENDENCY_REJECTED",
  );
  assert.equal(collectorDiagnostic({ signal: "SIGTERM" }).code, "DEPENDENCY_UNAVAILABLE");
  assert.equal(
    collectorDiagnostic({ stderr: "PRIVATE unknown condition" }).code,
    "DEPENDENCY_FAILED",
  );
});

test("existing identity-provider calls cannot bypass their diagnostic adapter", async () => {
  const ts = await import("typescript");
  for (const file of [
    "src/proxy.ts",
    "src/features/shell/components/footer.tsx",
    "src/features/access/server/auth.ts",
    "src/features/access/server/whitelist.ts",
    "src/features/access/server/request-store.ts",
    "src/features/collaboration/server/invitation-candidates.ts",
  ]) {
    const tree = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node: import("typescript").Node) {
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(tree);
        if (
          ["clerkClient", "currentUser", "auth.protect", "clerk"].includes(name) ||
          name.startsWith("client.")
        ) {
          let parent: import("typescript").Node | undefined = node.parent;
          let wrapped = false;
          while (parent) {
            if (ts.isCallExpression(parent) && parent.expression.getText(tree) === "callClerk") {
              wrapped = true;
              break;
            }
            parent = parent.parent;
          }
          assert.ok(wrapped, `${file}: provider call bypasses diagnostics`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
});

test("hosting and backend evidence join only on the same request and deployment", () => {
  const hosting = platformDiagnostic({
    timestamp: "2026-10-23T12:00:00.000Z",
    environment: "production",
    deploymentId: "dpl_1234567890abcdefgh",
    requestId: "iad1::abcdefghij123456",
    errorCode: "FUNCTION_INVOCATION_TIMEOUT",
  })!;
  const { logger, records } = fixture();
  logger.log("error", "db.transaction", { outcome: "commit_unknown" });
  const app = {
    ...records[0]!,
    deploymentId: hosting.deploymentId!,
    platformRequestId: hosting.platformRequestId!,
  };
  const entries = diagnosticEntries([hosting, app]);
  assert.deepEqual(entries[0]?.transactionOutcomes, ["commit_unknown"]);
  assert.equal(entries[0]?.relatedTraces.length, 2);
  assert.deepEqual(
    diagnosticEntries([hosting, { ...app, deploymentId: "dpl_different12345678" }])[0]
      ?.transactionOutcomes,
    [],
  );
});

test("runtime memory evidence is explicit and unknown database failures keep their boundary", async () => {
  const fatal = "FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory";
  assert.equal(heapExhausted(fatal), true);
  assert.equal(heapExhausted(`Type '${fatal}' is not assignable`), false);
  const { logger, records } = fixture();
  const base: Database = {
    query: async () => {
      throw new Error("PRIVATE");
    },
    transaction: (work) => work(base),
  };
  await assert.rejects(
    logger.observe("project.create", () => observedDatabase(base, logger).query("SELECT 1")),
  );
  assert.equal(diagnosticEntries(records)[0]?.diagnostic.code, "DATABASE_FAILED");
});
