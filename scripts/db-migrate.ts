import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');
const LOCK_ID = 0x50414c4d41; // 'PALMA'-ish advisory lock namespace.

async function main() {
  const { migrationSql } = await import('../src/server/db/sql');
  const sql = migrationSql();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  try {
    await sql`
      create table if not exists app_schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `;

    for (const filename of files) {
      const applied = await sql<{ filename: string }[]>`
        select filename from app_schema_migrations where filename = ${filename}
      `;
      if (applied.length > 0) {
        console.log(`skip ${filename}`);
        continue;
      }

      const body = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8');
      await sql.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(${LOCK_ID})`;
        const inside = await tx<{ filename: string }[]>`
          select filename from app_schema_migrations where filename = ${filename}
        `;
        if (inside.length > 0) return;
        await tx.unsafe(body);
        await tx`
          insert into app_schema_migrations (filename) values (${filename})
        `;
      });
      console.log(`applied ${filename}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
