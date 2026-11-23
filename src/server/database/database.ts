export interface Queryable {
  query(sql: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}
export interface Database extends Queryable {
  transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T>;
}

export function scopedDatabase(tx: Queryable): Database {
  return { query: (sql, values) => tx.query(sql, values), transaction: (work) => work(tx) };
}
