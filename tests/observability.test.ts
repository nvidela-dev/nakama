import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  rmSync,
  mkdirSync,
  rmdirSync,
  writeFileSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  Observability,
  BackendError,
  queryIdentity,
  sourceFrames,
} from "../src/server/observability/observability";
import { observedDatabase } from "../src/server/database/observed-database";
import { logRecordSchema, routeName, type LogRecord } from "../src/server/observability/log-model";
import { rotatingFileSink } from "../src/server/observability/log-file";
import {
  logArchives,
  parseLogLines,
  readLogFiles,
  summarizeLogs,
} from "../src/server/observability/log-reader";
import { ProjectError } from "../src/features/projects/server/projects";
import { DatabaseDecodeError } from "../src/server/database/query";
import type { Database } from "../src/server/database/database";
const fixture = () => {
  const records: LogRecord[] = [];
  return { records, logger: new Observability({ write: (r) => records.push(r), level: "debug" }) };
};
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

test("logging excludes private error text, details, paths, causes and SQL values", async () => {
  const { records, logger } = fixture();
  const secret = "PRIVATE_TOKEN_email@example.invalid_project_answer";
  const error = Object.assign(
    new Error(secret + "\n    at injected (/private/" + secret + ".ts:1:2)"),
    {
      code: "23505",
      detail: secret,
      query: secret,
      parameters: [secret],
      cause: new Error(secret),
    },
  );
  const origin: Database = {
    query: async () => {
      throw error;
    },
    transaction: (work) => work(origin),
  };
  const db = observedDatabase(origin, logger);
  await assert.rejects(
    logger.observe("project.create", () =>
      db.transaction((tx) => tx.query(`INSERT INTO projects(name) VALUES('${secret}')`, [secret])),
    ),
    (e) => e instanceof BackendError && e.code === "23505" && !JSON.stringify(e).includes(secret),
  );
  assert.ok(records.length >= 4);
  assert.ok(!JSON.stringify(records).includes(secret));
  assert.ok(!JSON.stringify(records).includes("INSERT INTO"));
  assert.ok(records.every((r) => logRecordSchema.safeParse(r).success));
  const errorIds = new Set(records.flatMap((r) => (r.error ? [r.error.id] : [])));
  assert.equal(errorIds.size, 1);
  assert.equal(summarizeLogs(records).unexpectedErrors, 1);
  assert.ok(records.some((r) => r.event === "db.transaction" && r.outcome === "rolled_back"));
  assert.ok(records.some((r) => r.event === "operation.finish" && r.outcome === "failed"));
});

test("nested concurrent operations keep separate traces and aggregate query timings", async () => {
  const { records, logger } = fixture();
  const origin: Database = {
    query: async () => {
      await wait(2);
      return { rows: [{ content: "PRIVATE BODY" }] };
    },
    transaction: (work) => work(origin),
  };
  const db = observedDatabase(origin, logger);
  const traceA = randomUUID(),
    traceB = randomUUID();
  await Promise.all([
    logger.observe(
      "task.change",
      async () => {
        await db.transaction(async (tx) => {
          await tx.query("SELECT 1");
          await tx.query("SELECT 2");
        });
      },
      { traceId: traceA },
    ),
    logger.observe(
      "notification.unread",
      async () => {
        await wait(1);
        await db.query("SELECT 3");
      },
      { traceId: traceB },
    ),
  ]);
  const finished = records.filter((r) => r.event === "operation.finish");
  assert.equal(finished.find((r) => r.traceId === traceA)?.queryCount, 2);
  assert.equal(finished.find((r) => r.traceId === traceB)?.queryCount, 1);
  assert.ok(finished.every((r) => (r.queryDurationMs ?? 0) > 0));
  assert.ok(records.some((r) => r.traceId === traceA && r.parentSpanId));
  assert.ok(!JSON.stringify(records).includes("PRIVATE BODY"));
});

test("handled validation, conflicts and Next navigation are distinct from unexpected failures", async () => {
  const { records, logger } = fixture();
  await logger.observe("project.edit", async () => {
    logger.reportError(new ProjectError("PRIVATE VALIDATION"));
    return { error: "Friendly error" };
  });
  assert.equal(records.at(-1)?.outcome, "rejected");
  assert.equal(records.filter((r) => r.level === "error").length, 0);
  const redirect = Object.assign(new Error("PRIVATE LOCATION"), {
    digest: "NEXT_REDIRECT;replace;/private?token=PRIVATE;307;",
  });
  await assert.rejects(
    logger.observe("invitation.accept", async () => {
      throw redirect;
    }),
    (e) => e === redirect,
  );
  assert.equal(records.at(-1)?.outcome, "navigation");
  assert.ok(!JSON.stringify(records).includes("PRIVATE"));
  await logger.observe("answer.save", async () => {
    logger.reportError(new DatabaseDecodeError());
    return { error: "Friendly error" };
  });
  assert.equal(records.at(-1)?.outcome, "failed");
  assert.equal(records.at(-1)?.error?.code, "DB_RESULT_INVALID");
});

test("failing sinks never change successful results or replace the original failure", async () => {
  const logger = new Observability({
    write: () => {
      throw new Error("Disk unavailable");
    },
    level: "debug",
  });
  assert.equal(await logger.observe("task.export", async () => 42), 42);
  const original = new Error("Original failure");
  await assert.rejects(
    logger.observe("task.change", async () => {
      throw original;
    }),
    (e) => e === original,
  );
});

test("routes and source locations contain code identity, never project paths or query strings", () => {
  assert.equal(
    routeName("/projects/PRIVATE/artifacts/PRIVATE/files/PRIVATE?token=PRIVATE"),
    "/projects/[projectId]/artifacts/[artifactId]/files/[fileId]",
  );
  assert.equal(routeName("/unknown/PRIVATE"), "unknown");
  const error = new Error("PRIVATE\n    at forged (/private/PRIVATE.ts:1:1)");
  error.stack = `${error.name}: ${error.message}\n    at real (${resolve("src/features/tasks/server/tasks.ts")}:25:1)`;
  assert.deepEqual(sourceFrames(error), [
    { file: "src/features/tasks/server/tasks.ts", line: 25, column: 1 },
  ]);
  assert.equal(queryIdentity(" SELECT 1\n ").queryId, queryIdentity("SELECT 1").queryId);
});

test("local files rotate, retain private permissions, and refuse symlink destinations", () => {
  const folder = mkdtempSync(join(tmpdir(), "nakama-logs-"));
  try {
    const file = join(folder, "private", "events.jsonl");
    const logger = new Observability({
      write: rotatingFileSink(file, { maxBytes: 1800, archives: 2 }),
      level: "debug",
    });
    for (let i = 0; i < 15; i++) logger.log("info", "server.start");
    const entries = readdirSync(join(folder, "private"));
    assert.equal(entries.length, 3);
    assert.equal(statSync(join(folder, "private")).mode & 0o777, 0o700);
    for (const entry of entries) {
      assert.equal(statSync(join(folder, "private", entry)).mode & 0o777, 0o600);
      assert.ok(statSync(join(folder, "private", entry)).size <= 1800);
      assert.ok(parseLogLines(readFileSync(join(folder, "private", entry), "utf8")).records.length);
    }
    const existing = readFileSync(file, "utf8");
    const link = join(folder, "symlink.jsonl");
    symlinkSync(file, link);
    const record = parseLogLines(existing).records[0]!;
    assert.throws(() => rotatingFileSink(link)(record));
    assert.equal(readFileSync(file, "utf8"), existing);
    mkdirSync(file + ".lock");
    assert.throws(() => rotatingFileSink(file)(record));
    rmdirSync(file + ".lock");
    assert.doesNotThrow(() => rotatingFileSink(file)(record));
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("platform imports and readers keep only validated records, tolerate truncation and deduplicate", async () => {
  const { records, logger } = fixture();
  await logger
    .observe("project.create", async () => {
      throw new DatabaseDecodeError();
    })
    .catch(() => {});
  const record = records.find((r) => r.error)!;
  const input =
    JSON.stringify({
      type: "log",
      data: {
        requestPath: "/PRIVATE",
        headers: "PRIVATE",
        message: JSON.stringify({
          ...record,
          content: "PRIVATE",
          error: { ...record.error, detail: "PRIVATE" },
        }),
      },
    }) +
    "\n" +
    '{"truncated":' +
    "\n" +
    JSON.stringify({ type: "summary", pagination: { next: "PRIVATE" } });
  const parsed = parseLogLines(input);
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.ignored, 1);
  assert.ok(!JSON.stringify(parsed.records).includes("PRIVATE"));
  const folder = mkdtempSync(join(tmpdir(), "nakama-log-reader-"));
  try {
    const file = join(folder, "events.jsonl"),
      write = rotatingFileSink(file);
    write(record);
    write(record);
    const read = readLogFiles(logArchives(file));
    assert.equal(read.records.length, 1);
    const output = execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/logs.ts", "summary", "--file", file, "--json"],
      { encoding: "utf8" },
    );
    const summary = JSON.parse(output) as {
      events: number;
      unexpectedErrors: number;
      errors: { hint: string }[];
    };
    assert.equal(summary.events, 1);
    assert.equal(summary.unexpectedErrors, 1);
    assert.ok(summary.errors[0]?.hint.includes("decoder"));
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("hostile error getters and untrusted extra log fields cannot break or poison diagnostics", () => {
  const { logger, records } = fixture();
  const error = new Error();
  Object.defineProperty(error, "stack", {
    get() {
      throw new Error("PRIVATE");
    },
  });
  assert.doesNotThrow(() => logger.reportError(error));
  assert.equal(records[0]?.error?.type, "UnknownError");
  logger.log("info", "server.start", { secret: "PRIVATE" } as never);
  assert.ok(!JSON.stringify(records).includes("PRIVATE"));
});

test("every exported server action keeps an operation scope and every action catch reports failures", async () => {
  const ts = await import("typescript");
  const { readdir } = await import("node:fs/promises");
  async function files(folder: string): Promise<string[]> {
    const entries = await readdir(folder, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(join(folder, entry.name))
          : Promise.resolve(entry.name.endsWith(".ts") ? [join(folder, entry.name)] : []),
      ),
    );
    return nested.flat();
  }
  let actions = 0;
  for (const file of await files("src/features")) {
    const source = readFileSync(file, "utf8");
    if (!source.startsWith('"use server";')) continue;
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function walk(node: import("typescript").Node) {
      if (
        ts.isFunctionDeclaration(node) &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
        node.body
      ) {
        actions++;
        const statement = node.body.statements.find(ts.isReturnStatement);
        assert.ok(
          statement &&
            ts.isReturnStatement(statement) &&
            statement.expression &&
            ts.isCallExpression(statement.expression) &&
            statement.expression.expression.getText(tree) === "observeAction",
          `${file}: missing action tracing`,
        );
      }
      if (ts.isCatchClause(node))
        assert.ok(
          node.block.getText(tree).includes("telemetry.reportError("),
          `${file}: silently caught failure`,
        );
      ts.forEachChild(node, walk);
    }
    walk(tree);
  }
  assert.ok(actions >= 25);
});

test("domain diagnostic types survive minification and preserve original feedback/conflicts", async () => {
  class a extends ProjectError {
    override readonly diagnosticType = "TaskConflictError";
    override readonly diagnosticCategory = "conflict";
  }
  const { logger, records } = fixture();
  const error = new a("PRIVATE CONFLICT BODY");
  assert.equal(logger.sanitizeError(error), error);
  await logger.observe("task.change", async () => {
    logger.reportError(error);
    return { error: "Friendly conflict" };
  });
  assert.equal(records.at(-1)?.outcome, "rejected");
  assert.equal(records.at(-1)?.error?.type, "TaskConflictError");
  assert.equal(records.at(-1)?.error?.category, "conflict");
  assert.ok(!JSON.stringify(records).includes("PRIVATE"));
});

test("info logging keeps slow queries and inclusive operation totals without fast-query noise", async () => {
  const records: LogRecord[] = [];
  const logger = new Observability({ write: (r) => records.push(r), level: "info" });
  const base: Database = {
    query: async (sql) => {
      if (sql === "SELECT 2") await wait(270);
      return { rows: [] };
    },
    transaction: (work) => work(base),
  };
  const db = observedDatabase(base, logger);
  await logger.observe("task.export", async () => {
    await db.query("SELECT 1");
    await db.query("SELECT 2");
  });
  const queries = records.filter((r) => r.event === "db.query");
  assert.equal(queries.length, 1);
  assert.equal(queries[0]?.level, "warn");
  assert.equal(records.at(-1)?.queryCount, 2);
});

test("write commits remain visible at info and ambiguous commits never claim rollback", async () => {
  const records: LogRecord[] = [];
  const logger = new Observability({ write: (r) => records.push(r), level: "info" });
  const base: Database = { query: async () => ({ rows: [] }), transaction: (work) => work(base) };
  await logger.observe("project.create", () =>
    observedDatabase(base, logger).transaction((tx) =>
      tx.query("INSERT INTO projects(name) VALUES($1)", ["PRIVATE"]),
    ),
  );
  assert.ok(
    records.some(
      (r) => r.event === "db.transaction" && r.level === "info" && r.outcome === "committed",
    ),
  );
  const ambiguous: Database = {
    query: base.query,
    transaction: async (work) => {
      await work(base);
      throw Object.assign(new Error("PRIVATE COMMIT DETAILS"), { code: "ECONNRESET" });
    },
  };
  await assert.rejects(
    logger.observe("project.create", () =>
      observedDatabase(ambiguous, logger).transaction((tx) =>
        tx.query("INSERT INTO projects(name) VALUES($1)", ["PRIVATE"]),
      ),
    ),
  );
  assert.ok(records.some((r) => r.event === "db.transaction" && r.outcome === "commit_unknown"));
  assert.ok(!records.some((r) => r.event === "db.transaction" && r.outcome === "rolled_back"));
  assert.ok(!JSON.stringify(records).includes("PRIVATE"));
});

test("malformed environment identity never silences logging", () => {
  const { records, logger } = fixture();
  const saved = { id: process.env.VERCEL_DEPLOYMENT_ID, build: process.env.NAKAMA_BUILD_ID };
  process.env.VERCEL_DEPLOYMENT_ID = "dpl_short";
  process.env.NAKAMA_BUILD_ID = "not hex!";
  try {
    logger.run("server.request", () => logger.reportError(new TypeError("boom"), "server.error"));
    logger.run("server.request", () => logger.reportError(new TypeError("boom"), "server.error"));
  } finally {
    if (saved.id === undefined) delete process.env.VERCEL_DEPLOYMENT_ID;
    else process.env.VERCEL_DEPLOYMENT_ID = saved.id;
    if (saved.build === undefined) delete process.env.NAKAMA_BUILD_ID;
    else process.env.NAKAMA_BUILD_ID = saved.build;
  }
  assert.equal(records.filter((r) => r.event === "server.error").length, 2);
  assert.ok(records.every((r) => !r.deploymentId && !r.buildId));
  const warnings = records.filter(
    (r) => r.event === "diagnostic" && r.diagnostic?.code === "CONFIGURATION_INVALID",
  );
  assert.equal(warnings.length, 1, "the configuration problem is reported once");
});

test("an invalid event is replaced by a field-name-only notice, rate limited", () => {
  const { records, logger } = fixture();
  const hostile = "PRIVATE_VALUE";
  for (let i = 0; i < 3; i++)
    logger.log("info", "operation.finish", {
      durationMs: -1,
      queryCount: hostile as unknown as number,
    });
  const notices = records.filter((r) => r.event === "logging.record_invalid");
  assert.equal(notices.length, 1);
  assert.deepEqual([...(notices[0]?.invalidFields ?? [])].sort(), ["durationMs", "queryCount"]);
  assert.ok(!JSON.stringify(records).includes(hostile));
  assert.equal(summarizeLogs(records).invalidRecordWarnings, 1);
});

test("approved codes in wrapped causes and framework digests are kept, text never is", () => {
  const { logger } = fixture();
  const wrapped = new Error("PRIVATE wrapper", {
    cause: new Error("PRIVATE inner", {
      cause: Object.assign(new Error("x"), { code: "ECONNRESET" }),
    }),
  });
  assert.equal(logger.errorInfo(wrapped).code, "ECONNRESET");
  const database = logger.errorInfo(
    new Error("w", { cause: Object.assign(new Error("x"), { code: "23505" }) }),
  );
  assert.equal(database.type, "DatabaseError");
  assert.equal(
    logger.errorInfo(new Error("w", { cause: Object.assign(new Error("x"), { code: "SECRET" }) }))
      .code,
    undefined,
  );
  // A cycle or very deep chain must terminate.
  const loop = new Error("loop");
  loop.cause = loop;
  assert.equal(logger.errorInfo(loop).code, undefined);

  const rendered = Object.assign(new Error("PRIVATE render"), { digest: "1234567890" });
  const info = logger.errorInfo(rendered);
  assert.equal(info.digest, "1234567890");
  assert.equal(
    logger.errorInfo(Object.assign(new Error("x"), { digest: "has space;" })).digest,
    undefined,
  );
  assert.equal(
    logger.errorInfo(Object.assign(new Error("x"), { digest: "NEXT_REDIRECT;replace;/p;307;" }))
      .digest,
    undefined,
  );
  assert.ok(!JSON.stringify(info).includes("PRIVATE"));
});

test("unexpected handled failures carry their logged error ID as a reference; rejections do not", async () => {
  const { logger } = fixture();
  const unexpected = await logger.observe("project.edit", async () => {
    logger.reportError(new Error("PRIVATE"));
    return logger.withReference<{ error: string; reference?: string }>({ error: "Friendly error" });
  });
  assert.match(unexpected.reference ?? "", /^[0-9a-f-]{36}$/);
  const rejected = await logger.observe("project.edit", async () => {
    logger.reportError(new ProjectError("PRIVATE"));
    return logger.withReference({ error: "Friendly error" });
  });
  assert.equal("reference" in rejected, false);
  const success = await logger.observe("project.edit", async () =>
    logger.withReference({ success: "Saved" }),
  );
  assert.equal("reference" in success, false);
});

test("logs CLI exits non-zero only when unexpected failures exist and can look up a render digest", () => {
  const folder = mkdtempSync(join(tmpdir(), "nakama-cli-"));
  const file = join(folder, "backend.jsonl");
  try {
    const records: LogRecord[] = [];
    const logger = new Observability({ write: (r) => records.push(r), level: "debug" });
    const run = (...args: string[]) => {
      try {
        const out = execFileSync("npx", ["tsx", "scripts/logs.ts", ...args, "--file", file], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });
        return { code: 0, out };
      } catch (error) {
        const e = error as { status: number; stdout: string };
        return { code: e.status, out: e.stdout };
      }
    };
    const write = () =>
      writeFileSync(file, records.map((r) => JSON.stringify(r)).join("\n") + "\n", { mode: 0o600 });
    logger.run("project.edit", () => logger.reportError(new ProjectError("handled")));
    write();
    assert.equal(run("summary", "--fail-on", "unexpected").code, 0);
    const failure = Object.assign(new Error("PRIVATE"), { digest: "9876543210" });
    logger.run("server.request", () => logger.reportError(failure, "server.error"));
    write();
    assert.equal(run("summary", "--fail-on", "unexpected").code, 2);
    const shown = run("show", "9876543210", "--json");
    assert.equal(shown.code, 0);
    assert.ok(shown.out.includes("APPLICATION_FAILED"));
    assert.equal(run("summary", "--fail-on", "everything").code !== 0, true);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
