import ts from "typescript";
import { relative } from "node:path";
import { telemetry } from "../src/lib/observability";
import { errorInfoSchema } from "../src/lib/log-model";

const configFile = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
const config = ts.parseJsonConfigFileContent(configFile.config ?? {}, ts.sys, process.cwd(), { incremental: false });
const program = ts.createProgram(config.fileNames, config.options);
const diagnostics = [...(configFile.error ? [configFile.error] : []), ...config.errors, ...ts.getPreEmitDiagnostics(program)];
const errors = diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
telemetry.run("build.typecheck", () => {
  for (const error of errors) {
    const position = error.file && error.start !== undefined ? error.file.getLineAndCharacterOfPosition(error.start) : undefined;
    const source = error.file && position ? errorInfoSchema.shape.frames.element.safeParse({ file: relative(process.cwd(), error.file.fileName), line: position.line + 1, column: position.character + 1 }) : undefined;
    telemetry.diagnostic({ family: "type", code: "TYPESCRIPT_COMPILE_FAILED", compilerCode: error.code, phase: error.file ? "compile" : "config" }, source?.success ? { source: source.data } : {});
  }
  telemetry.log(errors.length ? "error" : "info", "check.finish", { check: "typecheck", outcome: errors.length ? "failed" : "succeeded" });
}, { ...(process.env.NAKAMA_CHECK_TRACE_ID ? { traceId: process.env.NAKAMA_CHECK_TRACE_ID } : {}) });
console.log(`TypeScript: ${errors.length} error(s). Structured diagnostics saved; use npm run logs -- diagnostics. For full local compiler text: npm run typecheck:explain.`);
process.exitCode = errors.length ? 1 : 0;
