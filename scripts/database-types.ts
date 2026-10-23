import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url),
  output = new URL("src/lib/database.generated.ts", root);
const sql = new PGlite();
try {
  for (const file of (await readdir(new URL("migrations/", root)))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await sql.exec(await readFile(new URL(`migrations/${file}`, root), "utf8"));
  const enums = (
    await sql.query<{ name: string; values: string[] }>(
      `SELECT t.typname AS name,array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname`,
    )
  ).rows;
  const columns = (
    await sql.query<{
      table_name: string;
      column_name: string;
      is_nullable: string;
      udt_name: string;
    }>(
      `SELECT table_name,column_name,is_nullable,udt_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`,
    )
  ).rows;
  const pascal = (name: string) =>
    name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
  const primitive: Record<string, string> = {
    uuid: "string",
    text: "string",
    varchar: "string",
    int2: "number",
    int4: "number",
    int8: "string",
    float4: "number",
    float8: "number",
    numeric: "string",
    bool: "boolean",
    timestamptz: "Date",
    timestamp: "Date",
    bytea: "Uint8Array",
    json: "unknown",
    jsonb: "unknown",
  };
  let source =
    "// Generated from all SQL migrations by npm run db:types. Do not edit.\n// Database timestamps are Date; int8/numeric remain strings with node-postgres defaults.\n";
  for (const entry of enums) {
    const name = pascal(entry.name);
    source += `export const ${name}Values = ${JSON.stringify(entry.values)} as const;\nexport type ${name} = (typeof ${name}Values)[number];\n`;
    primitive[entry.name] = name;
  }
  source += "\nexport interface DatabaseRows {\n";
  for (const table of [...new Set(columns.map((c) => c.table_name))]) {
    source += `  ${table}: {\n`;
    for (const column of columns.filter((c) => c.table_name === table)) {
      const type = primitive[column.udt_name];
      if (!type)
        throw new Error(`Unsupported database type: ${column.udt_name}`);
      source += `    ${column.column_name}: ${type}${column.is_nullable === "YES" ? " | null" : ""};\n`;
    }
    source += "  };\n";
  }
  source += "}\n";
  if (process.argv.includes("--check")) {
    if ((await readFile(output, "utf8")) !== source)
      throw new Error("Database types are stale. Run npm run db:types.");
    console.log("Database types match the migrated schema.");
  } else {
    await writeFile(output, source);
    console.log("Generated " + fileURLToPath(output));
  }
} finally {
  await sql.close();
}
