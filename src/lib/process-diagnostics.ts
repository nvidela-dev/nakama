import { diagnosticSchema, type Diagnostic } from "./diagnostics";

export function processExitDiagnostic(code: number | null, signal: string | null): Diagnostic | undefined {
  if (code === 0 || signal === "SIGINT" || signal === "SIGTERM") return undefined;
  const signals = ["SIGABRT", "SIGKILL", "SIGSEGV", "SIGBUS", "SIGILL", "SIGQUIT", "SIGFPE", "SIGTRAP", "SIGXCPU", "SIGXFSZ"];
  return diagnosticSchema.parse({ family: "compute", code: "PROCESS_EXITED", provider: "local", evidence: "supervisor_exit",
    ...(signal ? { signal: signals.includes(signal) ? signal : "unknown" } : {}),
    ...(code !== null ? { exitCode: Math.max(0, Math.min(code, 255)) } : {}),
  });
}

// Documented V8 fatal diagnostic; a signal or generic invocation failure is insufficient.
export const heapExhausted = (text: string) => /(?:^|\r?\n)FATAL ERROR: [^\r\n]{0,200}JavaScript heap out of memory/.test(text);
export function memoryDiagnostic(): Diagnostic {
  return { family: "compute", code: "COMPUTE_MEMORY_EXCEEDED", provider: "node", evidence: "runtime_fatal", runtimeCode: "V8_HEAP_OUT_OF_MEMORY" };
}
