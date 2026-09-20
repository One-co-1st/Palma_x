import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/feedback';
import {
  ChangeEmailForm,
  ChangePasswordForm,
  CloseAccountForm,
  RevokeSessionsForm,
} from '@/components/account/AccountForms';
import { buildMetadata } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { homeForRole } from '@/lib/auth/entrances';
import { sql } from '@/server/db/sql';
import { formatShortDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';
import { CONTACTS } from '@/lib/legal';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Your account',
  description: 'Your PALMA sign-in, address and sessions.',
  path: '/account',
  noIndex: true,
});

/**
 * The account, not the record.
 *
 * Like the Dossier, this is role-neutral — a judge's password works the same
 * way a creator's does — so it asks only whether there is a session.
 */
export default async function AccountPage() {
  const session = await requireSession('/account');

  const [userRows, sessions] = await Promise.all([
    sql<
      {
        email: string;
        name: string;
        role: string;
        createdAt: string;
        lastLoginAt: string | null;
        creatorDisplayName: string | null;
        creatorSlug: string | null;
      }[]
    >`
      SELECT
        u."email",
        u."name",
        u."role",
        to_char(u."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
        to_char(u."lastLoginAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "lastLoginAt",
        c."displayName" AS "creatorDisplayName",
        c."slug" AS "creatorSlug"
      FROM "User" u
      LEFT JOIN "Creator" c ON c."userId" = u."id"
      WHERE u."id" = ${session.user.id}
      LIMIT 1
    `,
    sql<{ id: string; createdAt: string; userAgent: string | null }[]>`
      SELECT
        "id",
        to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
        "userAgent"
      FROM "AuthSession"
      WHERE "userId" = ${session.user.id}
        AND "revokedAt" IS NULL
        AND "expiresAt" > now()
      ORDER BY "createdAt" DESC
    `,
  ]);

  const row = userRows[0];
  const user = row
    ? {
        ...row,
        creator: row.creatorSlug
          ? { displayName: row.creatorDisplayName ?? '', slug: row.creatorSlug }
          : null,
      }
    : null;

  if (!user) {
    return (
      <PortalShell title="PALMA Account" userName={session.user.email}>
        <Notice tone="warning" title="Account not found">
          Sign out and in again.
        </Notice>
      </PortalShell>
    );
  }

  const others = sessions.filter((row) => row.id !== session.sessionId).length;

  return (
    <PortalShell title="PALMA Account" subtitle="Your account" userName={user.email}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Your sign-in, your address and your sessions. Your <em>record</em>, how you are described
          and what PALMA says happened, lives in your portal.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dossier">Your Dossier</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={homeForRole(session.user.role)}>Your portal</Link>
          </Button>
        </div>
      </div>

      <dl className="border-stone-deep mt-10 grid gap-x-10 gap-y-5 border-y py-8 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ['Name', user.name],
            ['Address', user.email],
            ['Role', titleCase(user.role.replace('_', ' '))],
            ['Member since', formatShortDate(user.createdAt)],
          ] as const
        ).map(([term, value]) => (
          <div key={term} className="flex min-w-0 flex-col gap-1">
            <dt className="palma-label text-taupe-deep">{term}</dt>
            <dd className="text-sm break-all">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-14 grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="flex min-w-0 flex-col gap-14 lg:col-span-7">
          <section>
            <h2 className="palma-label text-taupe-deep mb-2">Password</h2>
            <p className="text-taupe-deep mb-6 max-w-140 text-sm leading-relaxed">
              Changing it signs out every other session but this one. Your current password is
              required even though you are signed in, a borrowed unlocked laptop proves possession
              too, and this is the control that stops it becoming a stolen account.
            </p>
            <ChangePasswordForm />
          </section>

          <section>
            <h2 className="palma-label text-taupe-deep mb-2">Email address</h2>
            <p className="text-taupe-deep mb-6 max-w-140 text-sm leading-relaxed">
              The new address confirms before anything moves, and the old one is told it was asked
              for. Losing an inbox should not silently lose you the account.
            </p>
            <ChangeEmailForm current={user.email} />
          </section>

          <section>
            <h2 className="palma-label text-taupe-deep mb-2">Closing your account</h2>
            <CloseAccountForm heldRecord={user.creator?.displayName ?? null} />
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-10 lg:col-span-5">
          <section className="border-stone-deep border p-7">
            <h2 className="palma-label text-taupe-deep mb-4">Sessions</h2>
            <p className="text-taupe-deep mb-5 text-sm leading-relaxed">
              {sessions.length === 1
                ? 'This is your only signed-in session.'
                : `${sessions.length} sessions are signed in, including this one.`}
            </p>
            <ul className="mb-6 flex flex-col">
              {sessions.slice(0, 6).map((row) => (
                <li
                  key={row.id}
                  className="border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b py-3 text-sm last:border-none"
                >
                  <span className="text-taupe-deep min-w-0 truncate">
                    {row.userAgent ? row.userAgent.slice(0, 48) : 'Unknown device'}
                  </span>
                  <span className="palma-label text-taupe">
                    {row.id === session.sessionId
                      ? 'This one'
                      : formatShortDate(row.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
            <RevokeSessionsForm others={others} />
          </section>

          <section className="border-stone-deep border p-7">
            <h2 className="palma-label text-taupe-deep mb-4">Two-factor authentication</h2>
            <p className="text-taupe-deep text-sm leading-relaxed">
              Not offered yet. When it is, it will be required for accounts that can confer or
              revoke an honour rather than merely suggested, and PALMA would rather say that plainly
              than show a switch that does nothing.
            </p>
          </section>

          <section className="border-stone-deep border p-7">
            <h2 className="palma-label text-taupe-deep mb-4">Something else</h2>
            <p className="text-taupe-deep text-sm leading-relaxed">
              A correction to the record, an appeal, or anything a form cannot settle:{' '}
              <a href={`mailto:${CONTACTS.general}`} className="palma-link text-ink">
                {CONTACTS.general}
              </a>
              . A person reads it.
            </p>
          </section>
        </aside>
      </div>
    </PortalShell>
  );
}
