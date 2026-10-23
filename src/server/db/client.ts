import "server-only";

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Pool, types } from "pg";
import { SCHEMA_SQL } from "./schema";

export type DbQueryResult<T> = { rows: T[] };

export type DbExecutor = {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<DbQueryResult<T>>;
};

export type DbClient = DbExecutor & {
  transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T>;
};

type GlobalDb = typeof globalThis & {
  __fitosDb?: Promise<DbClient>;
};

const globalForDb = globalThis as GlobalDb;

/** Advisory lock key used while a managed database is provisioned once. */
const INIT_LOCK_KEY = 20_261_021;

function dataDir() {
  return process.env.FITOS_DATA_DIR ?? path.join(process.cwd(), ".data", "fitos");
}

function managedConnectionString() {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    null
  );
}

export function databaseDriver(): "pglite" | "postgres" {
  return managedConnectionString() ? "postgres" : "pglite";
}

function isLocalConnection(connectionString: string) {
  try {
    const host = new URL(connectionString).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  } catch {
    return false;
  }
}

function sslConfig(connectionString: string) {
  const enabled =
    process.env.DATABASE_SSL === "true" ||
    (process.env.DATABASE_SSL !== "false" && !isLocalConnection(connectionString));

  if (!enabled) return undefined;
  return {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
  };
}

async function createPgliteDatabase(): Promise<DbClient> {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });

  const { PGlite, types: pgliteTypes } = await import("@electric-sql/pglite");

  // Postgres DATE values are calendar dates, not instants. PGlite otherwise
  // parses them into JS Date objects, which breaks the app-wide YYYY-MM-DD
  // contract used for timezone-safe date math. The managed adapter applies
  // the same parser.
  const pglite = new PGlite(dir, {
    parsers: { [pgliteTypes.DATE]: (value) => value },
  });

  await pglite.exec(SCHEMA_SQL);

  const result = await pglite.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM profiles",
  );
  const count = result.rows[0]?.count ?? 0;

  if (count === 0 && process.env.FITOS_SEED_DEMO !== "false") {
    const { seedDemoData } = await import("./seed");
    await seedDemoData({
      async query<T>(sql: string, params: unknown[] = []) {
        const queryResult = await pglite.query<T>(sql, params as never[]);
        return { rows: queryResult.rows };
      },
      transaction: (fn) =>
        pglite.transaction(async (tx) =>
          fn({
            async query<T>(sql: string, params: unknown[] = []) {
              const queryResult = await tx.query<T>(sql, params as never[]);
              return { rows: queryResult.rows };
            },
          }),
        ),
    });
  }

  return {
    async query<T>(sql: string, params: unknown[] = []) {
      const queryResult = await pglite.query<T>(sql, params as never[]);
      return { rows: queryResult.rows };
    },
    transaction: (fn) =>
      pglite.transaction(async (tx) =>
        fn({
          async query<T>(sql: string, params: unknown[] = []) {
            const queryResult = await tx.query<T>(sql, params as never[]);
            return { rows: queryResult.rows };
          },
        }),
      ),
  };
}

/**
 * Managed PostgreSQL (Neon, Vercel Marketplace, etc.).
 *
 * A new deployment starts empty. Tables are created idempotently and, when
 * demo seeding is enabled, the demo gym is inserted once behind a
 * transaction-scoped advisory lock so concurrent cold starts cannot double-seed.
 * Set FITOS_AUTO_MIGRATE=false after applying db/migrations/0001_init.sql
 * manually if you prefer migrations to run outside the app.
 */
async function createManagedDatabase(connectionString: string): Promise<DbClient> {
  // Keep date-only values as YYYY-MM-DD, matching the PGlite adapter.
  types.setTypeParser(1082, (value) => value); // DATE
  types.setTypeParser(20, (value) => Number(value)); // INT8

  const poolMax = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "3", 10);

  const pool = new Pool({
    connectionString,
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: sslConfig(connectionString),
  });

  pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error", error);
  });

  if (process.env.FITOS_AUTO_MIGRATE !== "false") {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [INIT_LOCK_KEY]);
      await client.query(SCHEMA_SQL);

      const countResult = await client.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM profiles",
      );
      const count = countResult.rows[0]?.count ?? 0;

      if (count === 0 && process.env.FITOS_SEED_DEMO !== "false") {
        const { seedDemoData } = await import("./seed");

        const tx: DbExecutor = {
          async query<T>(sql: string, params: unknown[] = []) {
            const result = await client.query(sql, params);
            return { rows: result.rows as T[] };
          },
        };

        // The surrounding transaction already holds the advisory lock; seed
        // inside it instead of opening a nested transaction.
        await seedDemoData({
          query: tx.query,
          transaction: (fn) => fn(tx),
        });
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params);
      return { rows: result.rows as T[] };
    },
    async transaction<T>(fn: (tx: DbExecutor) => Promise<T>) {
      const client = await pool.connect();
      const tx: DbExecutor = {
        async query<Row>(sql: string, params: unknown[] = []) {
          const result = await client.query(sql, params);
          return { rows: result.rows as Row[] };
        },
      };

      try {
        await client.query("BEGIN");
        const result = await fn(tx);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export function getDb(): Promise<DbClient> {
  globalForDb.__fitosDb ??= (() => {
    const connectionString = managedConnectionString();
    return connectionString
      ? createManagedDatabase(connectionString)
      : createPgliteDatabase();
  })().catch((error) => {
    globalForDb.__fitosDb = undefined;
    throw error;
  });

  return globalForDb.__fitosDb;
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const result = await db.query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: unknown[] = []): Promise<void> {
  const db = await getDb();
  await db.query(sql, params);
}

export async function transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(fn);
}
