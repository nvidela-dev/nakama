import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
let failures = 0;
function check(ok, message) {
  console.log(`${ok ? "OK" : "MISSING"} ${message}`);
  if (!ok) failures++;
}

check(Number(process.versions.node.split(".")[0]) >= 22, "Node.js 22 or newer");
check(
  spawnSync("npm", ["--version"], { cwd: root, stdio: "ignore" }).status === 0,
  "npm available",
);
for (const file of [
  "package-lock.json",
  "node_modules/.package-lock.json",
  "AGENTS.md",
  "docs/agent-harness.md",
]) {
  check(existsSync(new URL(`../${file}`, import.meta.url)), file);
}
const requiredScripts = [
  "dev",
  "typecheck",
  "test",
  "build",
  "logs:check-bundle",
  "test:e2e",
];
if (process.argv.includes("--frontend")) {
  requiredScripts.push(
    "lint",
    "format:check",
    "architecture:check",
    "flows:check",
    "storybook",
    "storybook:build",
  );
}
for (const name of requiredScripts) {
  check(typeof pkg.scripts?.[name] === "string", `npm script: ${name}`);
}
console.log(
  "No credentials inspected, services contacted, dependencies installed, or files changed.",
);
console.log(
  "For a fresh checkout, run npm ci before make check. Browser tests require separate service setup.",
);
process.exitCode = failures ? 1 : 0;
