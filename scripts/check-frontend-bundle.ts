import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
async function traces(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? traces(join(directory, entry.name))
          : Promise.resolve(entry.name.endsWith(".nft.json") ? [join(directory, entry.name)] : []),
      ),
    )
  ).flat();
}
const files = await traces(".next/server");
if (!files.length) throw new Error("Build the application before inspecting deployment traces.");
const forbidden =
  /(?:^|\/)(?:storybook-static|\.storybook|@storybook|storybook|@axe-core)(?:\/|$)|\.stories\.[cm]?[jt]sx?$/;
for (const file of files) {
  const trace: unknown = JSON.parse(await readFile(file, "utf8"));
  if (
    !trace ||
    typeof trace !== "object" ||
    !("files" in trace) ||
    !Array.isArray(trace.files) ||
    !trace.files.every((entry: unknown) => typeof entry === "string")
  )
    throw new Error("Invalid deployment trace.");
  if (trace.files.some((entry: string) => forbidden.test(entry)))
    throw new Error("Development-only UI tooling was found in application deployment traces.");
}
console.log(
  `Frontend bundle verified: ${files.length} deployment traces exclude Storybook, stories, and accessibility test tooling.`,
);
