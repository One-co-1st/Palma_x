-- SQL migration ledger. Prisma's `_prisma_migrations` remains as history only;
-- this table is the forward-going authority once the app is Prisma-free.
create table if not exists app_schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
