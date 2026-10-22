import "server-only";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import type { Database } from "./database";

let instance: Database | undefined;
export function database(): Database {
  if (instance) return instance;
  if (!process.env.DATABASE_URL)
    throw new Error("Database configuration is missing.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  attachDatabasePool(pool);
  instance = {
    query: (sql, values) => pool.query(sql, values),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await work(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
  return instance;
}
