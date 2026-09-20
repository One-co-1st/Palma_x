import postgres from 'postgres';
import { databaseUrl, directDatabaseUrl, env } from '@/lib/env';

const globalForSql = globalThis as unknown as { palmaSql?: postgres.Sql };

function postgresConnection(url: string): { url: string; ssl?: 'require' } {
  const parsed = new URL(url);
  const sslmode = parsed.searchParams.get('sslmode');
  for (const key of ['schema', 'connection_limit', 'pool_timeout', 'pgbouncer', 'sslmode']) {
    parsed.searchParams.delete(key);
  }
  if ([...parsed.searchParams.keys()].length === 0) parsed.search = '';
  return { url: parsed.toString(), ssl: sslmode === 'require' ? 'require' : undefined };
}

function poolMax(): number {
  const configured = Number(process.env.PG_POOL_MAX ?? '');
  if (Number.isInteger(configured) && configured > 0) return configured;
  return process.env.NEXT_PHASE === 'phase-production-build' ? 8 : 2;
}

function createSql(): postgres.Sql {
  const dbUrl = databaseUrl();
  if (!dbUrl) {
    throw new Error(
      'DATABASE_URL is not set. The `sql` template tag requires a direct PostgreSQL connection.',
    );
  }
  const connection = postgresConnection(dbUrl);

  return postgres(connection.url, {
    max: poolMax(),
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl: connection.ssl,
  });
}

/**
 * Lazily initialised. The connection is created on first use, not on import.
 * Pages that never call `sql` (e.g. those using the Supabase REST client)
 * will never trigger a connection attempt.
 */
export const sql: postgres.Sql = (() => {
  const dbUrl = databaseUrl();
  if (!dbUrl) {
    return new Proxy((() => {}) as unknown as postgres.Sql, {
      apply() {
        throw new Error('DATABASE_URL is not set.');
      },
      get(_, prop) {
        if (prop === 'then' || prop === Symbol.toPrimitive || prop === Symbol.toStringTag) {
          return undefined;
        }
        throw new Error('DATABASE_URL is not set.');
      },
    });
  }
  return globalForSql.palmaSql ?? createSql();
})();

if (env.NODE_ENV !== 'production' && databaseUrl()) {
  globalForSql.palmaSql = sql;
}

export type Sql = postgres.Sql;
export type TransactionSql = postgres.TransactionSql;

export async function withTransaction<T>(run: (tx: TransactionSql) => Promise<T>): Promise<T> {
  return (await sql.begin(async (tx) => run(tx as TransactionSql))) as T;
}

export function migrationSql(): postgres.Sql {
  const connection = postgresConnection(directDatabaseUrl());
  return postgres(connection.url, { max: 1, prepare: false, idle_timeout: 5, ssl: connection.ssl });
}

export async function closeSql(): Promise<void> {
  if (globalForSql.palmaSql) {
    await globalForSql.palmaSql.end({ timeout: 5 });
  }
}
