import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

export function buildProvenance(): { release: string; buildId: string } {
  const git = (args: string[]) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024 }).trim();
  let release = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
  const hash = createHash("sha256");
  try {
    release = git(["rev-parse", "HEAD"]);
    // Include uncommitted source/configuration; never read environment files or logs.
    const files = git(["ls-files", "--cached", "--others", "--exclude-standard", "-z", "src", "scripts", "migrations", "package.json", "package-lock.json", "next.config.ts", "tsconfig.json"]);
    for (const file of files.split("\0").filter(Boolean).sort()) {
      hash.update(file);
      try { hash.update(readFileSync(file)); } catch { hash.update("deleted"); }
    }
  } catch { hash.update("unversioned"); }
  if (!/^[a-f0-9]{7,40}$/.test(release)) release = "local";
  hash.update(release);
  hash.update(process.version);
  // A distinct build invocation must never reuse maps from another compilation.
  hash.update(randomBytes(16));
  return { release, buildId: hash.digest("hex").slice(0, 32) };
}
