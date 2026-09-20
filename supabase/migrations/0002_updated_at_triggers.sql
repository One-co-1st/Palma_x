-- Prisma's `@updatedAt` was client-managed. Keep the behaviour in Postgres so
-- removing Prisma cannot silently freeze `updatedAt` columns.

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'User',
    'Creator',
    'CreatorVerification',
    'AwardYear',
    'Category',
    'Nominator',
    'Candidacy',
    'Judge',
    'Honour',
    'Sponsor',
    'Sponsorship',
    'CreatorClaim',
    'Article',
    'EmailSubscription',
    'CreatorPortrait',
    'FeatureSetting',
    'SponsorshipPackage',
    'Campaign',
    'PalmaEvent',
    'TicketType',
    'AwardPhysicalItem',
    'AwardMarkLicence',
    'Opportunity',
    'SystemSetting',
    'ProductEntry'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on %I', table_name);
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function set_updated_at()',
      table_name
    );
  end loop;
end;
$$;
