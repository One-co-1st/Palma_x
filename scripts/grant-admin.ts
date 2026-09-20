/**
 * The first administrator.
 *
 * PALMA has no sign-up form for staff: a judge, moderator or administrator
 * account exists only because somebody holding `admin:manage_users` created
 * it. That is the right rule everywhere except at the very beginning, where it
 * is a locked door with the key inside. A freshly migrated database has no
 * administrator, so nobody can invite one, so there is never an administrator.
 *
 * The seed solves it for development by creating the whole cast, but the seed
 * deletes and rewrites the rows it owns and sets every password from
 * SEED_PASSWORD, so it must never be pointed at a real database.
 *
 * This is the production-safe way through, and it deliberately does the
 * smallest possible thing: it promotes an account that already exists. Nobody
 * is created, no password is set or reset, and nothing is deleted. Register
 * normally at /register, then run this against that address.
 *
 *   npx tsx scripts/grant-admin.ts you@example.com
 *
 * Against Supabase, set DIRECT_URL to the direct connection (port 5432) as
 * well as the pooled DATABASE_URL, or the migration/runtime split is wrong.
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
  const { createId } = await import('../src/server/db/ids');
  const { sql, withTransaction } = await import('../src/server/db/sql');

  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    console.error('\n  Which account?\n');
    console.error('    npx tsx scripts/grant-admin.ts you@example.com\n');
    process.exitCode = 1;
    return;
  }

  const [user] = await sql<
    { id: string; email: string; name: string; role: string; isActive: boolean }[]
  >`
    select id, email, name, role, "isActive"
    from "User"
    where email = ${email}
    limit 1
  `;

  if (!user) {
    console.error(`\n  No PALMA account for ${email}.`);
    console.error('  Register at /register first, then run this again.');
    console.error('  This script promotes an account; it never creates one.\n');
    process.exitCode = 1;
    return;
  }

  if (user.role === 'super_admin') {
    console.log(`\n  ${user.email} is already a super administrator. Nothing to do.\n`);
    return;
  }

  const previous = user.role;

  await withTransaction(async (tx) => {
    await tx`
      update "User" set role = 'super_admin' where id = ${user.id}
    `;

    // On the record like any other privilege change, and named as what it is,
    // so an audit reader can tell a bootstrap apart from a promotion somebody
    // made through the interface.
    await tx`
      insert into "AuditLog" (
        id, "actorId", "actorRole", "actorLabel", action, "entityType", "entityId",
        summary, before, after
      ) values (
        ${createId()},
        ${user.id},
        'super_admin',
        'scripts/grant-admin.ts',
        'user.role_changed',
        'User',
        ${user.id},
        ${`${user.email}: ${previous} to super_admin, granted from the command line`},
        ${JSON.stringify({ role: previous })},
        ${JSON.stringify({ role: 'super_admin' })}
      )
    `;
  });

  console.log(`\n  ${user.email} is now a super administrator (was ${previous}).`);
  if (!user.isActive) {
    console.log('  Note: the account is suspended, so it still cannot sign in.');
  }
  console.log('  Sign in at /admin. Everyone else is invited from /admin/users.\n');
}

main()
  .catch((error) => {
    console.error('\n  Failed:', error instanceof Error ? error.message : error);
    console.error('  If this is a connection error against Supabase, check that DIRECT_URL');
    console.error('  is set to the direct connection on port 5432.\n');
    process.exitCode = 1;
  })
  .finally(async () => {
    const { closeSql } = await import('../src/server/db/sql');
    await closeSql();
  });
