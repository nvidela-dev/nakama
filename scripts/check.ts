import { z } from "zod";
import { heapExhausted, memoryDiagnostic, processExitDiagnostic } from "../src/lib/process-diagnostics";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { buildProvenance } from "../src/lib/build-provenance";
import { telemetry } from "../src/lib/observability";
import type { Diagnostic } from "../src/lib/diagnostics";
const command = process.argv[2];
function provenanceForCommand() {
  if (command !== "start") return buildProvenance();
  try {
    return z.object({ release: z.string().regex(/^(?:[a-f0-9]{7,40}|local)$/), buildId: z.string().regex(/^[a-f0-9]{32}$/) }).parse(JSON.parse(readFileSync(".next/nakama-build.json", "utf8")));
  } catch {
    telemetry.run("build.next", () => telemetry.diagnostic({ family: "backend", code: "CONFIGURATION_INVALID", component: "build_metadata" }));
    process.exit(1);
  }
}
const provenance = provenanceForCommand();
process.env.NAKAMA_RELEASE = provenance.release;
process.env.NAKAMA_BUILD_ID = provenance.buildId;
if (!["typecheck", "build", "dev", "start"].includes(command ?? "")) throw new Error("Choose typecheck, build, dev, or start.");
async function run(script: string, args: string[], operation: "build.typecheck" | "build.schema" | "build.next" | "compute.process", failure?: Diagnostic) {
  const traceId = process.env.NAKAMA_CHECK_TRACE_ID ?? randomUUID();
  process.env.NAKAMA_CHECK_TRACE_ID = traceId;
  const child = spawn(process.execPath, [script, ...args], { env: process.env, stdio: ["inherit", "inherit", "pipe"] });
  let fatalMemory = false, stderrTail = "";
  child.stderr.on("data", (chunk: Buffer) => {
    // Forward normal terminal output; retain only a bounded transient matching window.
    process.stderr.write(chunk);
    stderrTail = (stderrTail + chunk.toString("utf8")).slice(-1024);
    fatalMemory ||= heapExhausted(stderrTail);
  });
  const signals = ["SIGINT", "SIGTERM"] as const;
  const forward = (signal: typeof signals[number]) => { child.kill(signal); };
  const interrupt = () => forward("SIGINT"), terminate = () => forward("SIGTERM");
  process.on("SIGINT", interrupt); process.on("SIGTERM", terminate);
  const result = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(resolve => {
    child.once("error", () => resolve({ code: 1, signal: null }));
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  process.off("SIGINT", interrupt); process.off("SIGTERM", terminate);
  telemetry.run(operation, () => {
    const exited = processExitDiagnostic(result.code, result.signal);
    if (fatalMemory && exited) telemetry.diagnostic(memoryDiagnostic());
    else if (result.signal && exited) telemetry.diagnostic(exited);
    else if (result.code && failure) telemetry.diagnostic(failure);
    else if (result.code && exited) telemetry.diagnostic(exited);
    telemetry.log(result.code || result.signal && !["SIGINT", "SIGTERM"].includes(result.signal) ? "error" : "info", "check.finish", { check: operation === "build.schema" ? "schema" : operation === "build.next" ? "build" : operation === "build.typecheck" ? "typecheck" : "supervisor", outcome: result.code === 0 ? "succeeded" : "failed" });
  }, { traceId });
  return result.code ?? (result.signal === "SIGINT" ? 130 : result.signal === "SIGTERM" ? 143 : 1);
}
let code = 0;
if (command === "typecheck" || command === "build") {
  code = await run("node_modules/tsx/dist/cli.mjs", ["scripts/database-types.ts", "--check"], "build.schema", { family: "build", code: "SCHEMA_CHECK_FAILED", tool: "schema" });
  if (!code) code = await run("node_modules/tsx/dist/cli.mjs", ["scripts/typecheck.ts"], "build.typecheck");
}
if (!code && command !== "typecheck") code = await run("node_modules/next/dist/bin/next", [command!, ...process.argv.slice(3)], command === "build" ? "build.next" : "compute.process", command === "build" ? { family: "build", code: "BUILD_FAILED", tool: "next" } : undefined);
if (!code && command === "build") writeFileSync(".next/nakama-build.json", JSON.stringify(provenance));
process.exitCode = code;
