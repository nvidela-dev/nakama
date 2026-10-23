import { performance } from "node:perf_hooks";
import type { Database, Queryable } from "@/server/database/database";
import type { Observability } from "@/server/observability/observability";
import { queryIdentity, sourceFrames } from "@/server/observability/observability";
import type { OperationName } from "@/server/observability/log-model";

type Run = <T>(operation: OperationName, work: () => Promise<T>) => Promise<T>;
export function observedDatabase(db: Database, telemetry: Observability, run?: Run): Database {
  const inContext: Run =
    run ?? ((operation, work) => (telemetry.context() ? work() : telemetry.run(operation, work)));
  const wrap = (tx: Queryable, transaction?: { writes: boolean }): Queryable => ({
    query: (sql, values) =>
      inContext("database.query", async () => {
        const started = performance.now(),
          identity = queryIdentity(sql);
        const source = sourceFrames(new Error())[0];
        if (transaction && ["INSERT", "UPDATE", "DELETE", "WITH"].includes(identity.queryKind))
          transaction.writes = true;
        try {
          const result = await tx.query(sql, values);
          const durationMs = Math.round((performance.now() - started) * 100) / 100;
          telemetry.log(durationMs >= 250 ? "warn" : "debug", "db.query", {
            ...identity,
            durationMs,
            rowCount: result.rows.length,
            outcome: "succeeded",
            ...(source ? { source } : {}),
          });
          return result;
        } catch (error) {
          const info = telemetry.errorInfo(error, "database");
          telemetry.log(info.category === "unexpected" ? "error" : "info", "db.query", {
            ...identity,
            durationMs: Math.round((performance.now() - started) * 100) / 100,
            outcome: "failed",
            error: info,
            ...(source ? { source } : {}),
          });
          throw telemetry.sanitizeError(error);
        } finally {
          const stats = telemetry.context()?.stats;
          if (stats) {
            stats.queryCount++;
            stats.queryDurationMs += performance.now() - started;
          }
        }
      }),
  });
  return {
    ...wrap(db),
    transaction: (work) =>
      inContext("database.transaction", () =>
        telemetry.run("database.transaction", async () => {
          const started = performance.now(),
            transaction = { writes: false };
          let callbackFinished = false;
          const context = telemetry.context();
          if (context) context.transaction = { rollbackFailed: false };
          try {
            const result = await db.transaction(async (tx) => {
              const value = await work(wrap(tx, transaction));
              callbackFinished = true;
              return value;
            });
            const durationMs = Math.round((performance.now() - started) * 100) / 100;
            telemetry.log(
              durationMs >= 1000 ? "warn" : transaction.writes ? "info" : "debug",
              "db.transaction",
              { durationMs, outcome: "committed" },
            );
            return result;
          } catch (error) {
            const info = telemetry.errorInfo(error);
            telemetry.log(info.category === "unexpected" ? "error" : "info", "db.transaction", {
              durationMs: Math.round((performance.now() - started) * 100) / 100,
              outcome: callbackFinished
                ? "commit_unknown"
                : context?.transaction?.rollbackFailed
                  ? "rollback_failed"
                  : "rolled_back",
              error: info,
            });
            throw telemetry.sanitizeError(error);
          }
        }),
      ),
  };
}
