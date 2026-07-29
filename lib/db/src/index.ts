import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getPool(): pg.Pool {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL environment variable is missing. Did you forget to configure it in Firebase App Hosting settings?"
      );
    }
    poolInstance = new Pool({ connectionString });
  }
  return poolInstance;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

// Keep the exported db and pool for backward compatibility, but make them lazy-evaluated Proxies
export const pool = new Proxy({} as pg.Pool, {
  get(_, prop) {
    const target = getPool();
    const val = Reflect.get(target, prop);
    return typeof val === "function" ? val.bind(target) : val;
  },
  set(_, prop, value) {
    const target = getPool();
    return Reflect.set(target, prop, value);
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    const target = getDb();
    const val = Reflect.get(target, prop);
    return typeof val === "function" ? val.bind(target) : val;
  }
});

export * from "./schema";
