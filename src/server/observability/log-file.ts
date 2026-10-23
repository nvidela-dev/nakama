import {
  constants,
  openSync,
  closeSync,
  fchmodSync,
  fstatSync,
  writeSync,
  mkdirSync,
  lstatSync,
  renameSync,
  unlinkSync,
  rmdirSync,
  statSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import type { LogRecord } from "@/server/observability/log-model";

export const defaultLogFile = () =>
  resolve(/*turbopackIgnore: true*/ process.cwd(), ".nakama/logs/backend.jsonl");
export function configuredLogFile(): string | undefined {
  if (process.env.NAKAMA_LOG_FILE === "off" || process.env.VERCEL || process.env.NODE_TEST_CONTEXT)
    return undefined;
  return resolve(/*turbopackIgnore: true*/ process.env.NAKAMA_LOG_FILE || defaultLogFile());
}
function regularFile(path: string): boolean {
  try {
    const stat = lstatSync(/*turbopackIgnore: true*/ path);
    if (!stat.isFile() || stat.nlink !== 1) throw new Error("Unsafe log destination");
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT")
      return false;
    throw error;
  }
}
// Local-only synchronous appends finish before a request returns. A short-lived lock
// coordinates rotation between dev workers; contention drops the file copy, not stdout.
export function rotatingFileSink(
  file: string,
  options: { maxBytes?: number; archives?: number } = {},
) {
  if (!file.endsWith(".jsonl")) throw new Error("Log files must end in .jsonl");
  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024,
    archives = options.archives ?? 3;
  if (maxBytes < 256 || !Number.isInteger(archives) || archives < 1 || archives > 10)
    throw new Error("Invalid log retention");
  return (record: LogRecord) => {
    const line = Buffer.from(JSON.stringify(record) + "\n");
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    const lock = file + ".lock";
    try {
      mkdirSync(lock, { mode: 0o700 });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
        // Recover a lock left by a terminated process, never wait on another writer.
        if (Date.now() - statSync(/*turbopackIgnore: true*/ lock).mtimeMs > 60_000) {
          rmdirSync(lock);
        }
        throw Object.assign(new Error("Log file busy"), { code: "LOG_FILE_BUSY" });
      }
      throw error;
    }
    try {
      if (
        regularFile(file) &&
        statSync(/*turbopackIgnore: true*/ file).size + line.length > maxBytes
      ) {
        if (regularFile(`${file}.${archives}`)) unlinkSync(`${file}.${archives}`);
        for (let n = archives - 1; n >= 1; n--)
          if (regularFile(`${file}.${n}`)) renameSync(`${file}.${n}`, `${file}.${n + 1}`);
        renameSync(file, `${file}.1`);
      }
      const fd = openSync(
        /*turbopackIgnore: true*/ file,
        constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW,
        0o600,
      );
      try {
        if (!fstatSync(fd).isFile() || fstatSync(fd).nlink !== 1)
          throw new Error("Unsafe log destination");
        fchmodSync(fd, 0o600);
        let offset = 0;
        while (offset < line.length) offset += writeSync(fd, line, offset, line.length - offset);
      } finally {
        closeSync(fd);
      }
    } finally {
      rmdirSync(lock);
    }
  };
}
