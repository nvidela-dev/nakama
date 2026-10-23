import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { defaultLogFile } from "../src/server/observability/log-file";

if (process.argv.includes("--seed")) {
  const file = defaultLogFile();
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  try {
    const fd = openSync(file, "wx", 0o600);
    try {
      writeFileSync(fd, '{"buildTraceProbe":true}\n');
    } finally {
      closeSync(fd);
    }
    console.log("Created a synthetic ignored log file for deployment-exclusion verification.");
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "EEXIST"))
      throw error;
    console.log("Existing log file preserved for deployment-exclusion verification.");
  }
} else {
  if (!existsSync(".next"))
    throw new Error("Build the application before checking deployment traces.");
  const logFolder = resolve(".nakama");
  let checked = 0;
  function visit(folder: string) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const file = join(folder, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith(".nft.json")) {
        checked++;
        const trace: unknown = JSON.parse(readFileSync(file, "utf8"));
        if (
          !trace ||
          typeof trace !== "object" ||
          !("files" in trace) ||
          !Array.isArray(trace.files)
        )
          throw new Error("Invalid deployment trace.");
        for (const path of trace.files) {
          if (typeof path !== "string") throw new Error("Invalid deployment trace path.");
          const inside = relative(logFolder, resolve(dirname(file), path));
          if (inside === "" || (!inside.startsWith("..") && !inside.startsWith("/")))
            throw new Error("Operational files entered a deployment trace. Release blocked.");
        }
      }
    }
  }
  visit(".next");
  if (!checked) throw new Error("No deployment traces found.");
  console.log(`${checked} deployment traces checked; no operational files included.`);
}
