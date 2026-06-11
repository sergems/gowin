import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let _pool = new Pool({ connectionString: process.env.DATABASE_URL });
export let db = drizzle(_pool, { schema });
export let pool = _pool;

export async function testDatabaseConnection(connectionString: string): Promise<{ ok: boolean; error?: string }> {
  const testPool = new Pool({ connectionString, connectionTimeoutMillis: 5000, max: 1 });
  try {
    const client = await testPool.connect();
    await client.query("SELECT 1");
    client.release();
    await testPool.end();
    return { ok: true };
  } catch (err: any) {
    await testPool.end().catch(() => {});
    return { ok: false, error: err.message };
  }
}

export function createDb(connectionString: string) {
  const p = new Pool({ connectionString });
  return { pool: p, db: drizzle(p, { schema }) };
}

export function switchDatabase(connectionString: string): void {
  const oldPool = _pool;
  const newPool = new Pool({ connectionString });
  _pool = newPool;
  pool = newPool;
  db = drizzle(newPool, { schema });
  oldPool.end().catch(() => {});
}

export * from "./schema";
