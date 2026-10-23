import EmbeddedPostgres from "embedded-postgres";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
// Disposable, synthetic-only verification database. Never reads .env.local or hosted data.
const directory = await mkdtemp(join(tmpdir(), "nakama-postgres-"));
const server = new EmbeddedPostgres({
  databaseDir: join(directory, "data"),
  port: 54331,
  user: "postgres",
  password: "nakama-local",
  persistent: false,
  createPostgresUser: false,
  postgresFlags: ["-h", "127.0.0.1", "-k", directory],
  onLog: () => {},
  onError: () => {},
});
try {
  await server.initialise();
  await server.start();
  const client = server.getPgClient("postgres", "127.0.0.1");
  await client.connect();
  try {
    const root = new URL("../migrations/", import.meta.url);
    for (const file of (await readdir(root))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await client.query("BEGIN");
      try {
        await client.query(await readFile(new URL(file, root), "utf8"));
        await client.query("COMMIT");
      } catch {
        await client.query("ROLLBACK");
        throw new Error("Local database migration failed.");
      }
    }
  } finally {
    await client.end();
  }
  console.log(
    "Disposable database: postgresql://postgres:nakama-local@127.0.0.1:54331/postgres",
  );
} catch {
  await server.stop().catch(() => {});
  await rm(directory, { recursive: true, force: true });
  throw new Error(
    "Could not start the disposable local database. Check port 54331 and local binary support.",
  );
}
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await server.stop();
  await rm(directory, { recursive: true, force: true });
  process.exit(0);
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
