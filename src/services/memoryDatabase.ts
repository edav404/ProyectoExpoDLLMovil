import { DatabaseSync } from 'node:sqlite';

import type { SqlDatabase, SqlValue } from './database';

/** Base en memoria para las pruebas. La app usa expo-sqlite. */
export function openMemoryDatabase(): SqlDatabase {
  const db = new DatabaseSync(':memory:');
  return {
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, params: SqlValue[] = []) {
      db.prepare(sql).run(...params);
    },
    async all<T>(sql: string, params: SqlValue[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async transaction<T>(task: () => Promise<T>) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = await task();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
