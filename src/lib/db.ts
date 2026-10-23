import "server-only";
import { DiagnosticError } from "./diagnostics";
import { performance } from "node:perf_hooks";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import type { Database } from "./database";
import { observedDatabase } from "./observed-database";
import { telemetry } from "./observability";
import { withRequestContext } from "./request-observability";

let instance: Database | undefined;
export function database(): Database {
  if (instance) return instance;
  if (!process.env.DATABASE_URL)
    throw new DiagnosticError({ family: "backend", code: "CONFIGURATION_INVALID", component: "database" });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  attachDatabasePool(pool);
  pool.on("error", error => { telemetry.reportError(error, "db.pool_error"); });
  instance = observedDatabase({
    query: (sql, values) => pool.query(sql, values),
    async transaction(work) {
      const started = performance.now();
      const client = await pool.connect().catch(error => {
        telemetry.log("error", "db.connection", { durationMs: performance.now() - started, outcome: "failed", error: telemetry.errorInfo(error, "database") });
        throw error;
      });
      const durationMs = performance.now() - started;
      telemetry.log(durationMs >= 250 ? "warn" : "debug", "db.connection", { durationMs, outcome: "succeeded", pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount } });
      let broken = false;
      try {
        await client.query("BEGIN").catch(error => { telemetry.errorInfo(error, "database"); throw error; });
        const result = await work(client);
        await client.query("COMMIT").catch(error => { telemetry.errorInfo(error, "database"); throw error; });
        return result;
      } catch (error) {
        try { await client.query("ROLLBACK"); }
        catch (rollbackError) { const state = telemetry.context()?.transaction; if (state) state.rollbackFailed = true; broken = true; telemetry.reportError(rollbackError, "db.rollback_error"); }
        throw error;
      } finally {
        client.release(broken);
      }
    },
  }, telemetry, withRequestContext);
  return instance;
}
