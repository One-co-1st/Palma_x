import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, Notice } from '@/components/ui/feedback';
import {
  AccountStateForm,
  InviteOperatorForm,
  IssueResetLinkForm,
  RevokeSessionsForm,
  RoleForm,
} from '@/components/admin/PeopleForms';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { listAccounts } from '@/server/data/people';
import { ROLES, type Role } from '@/lib/auth/rbac';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Users & roles',
  description: 'PALMA account management.',
  path: '/admin/users',
  noIndex: true,
});

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; state?: string }>;
}) {
  await requirePermission('admin:manage_users', '/admin/users');
  const { q, role, state } = await searchParams;

  const accounts = await listAccounts({
    query: q,
    role: ROLES.includes(role as Role) ? (role as Role) : undefined,
    state: state === 'suspended' ? 'suspended' : state === 'active' ? 'active' : undefined,
  });

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">People</span>
        <h1 className="text-4xl">Users &amp; roles</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          An account is somebody who signs in. A creator is a record in the archive. Most creators
          have no account at all, and most accounts hold no creator. Managing them on one screen
          would quietly merge two things PALMA keeps apart.
        </p>
      </div>

      <section className="border-stone-deep mt-10 border p-6">
        <h2 className="font-display text-xl">Invite a colleague</h2>
        <p className="text-taupe-deep mt-2 max-w-160 leading-relaxed">
          Judges, moderators and administrators have no sign-up form. This is the only way one of
          these accounts comes to exist.
        </p>
        <div className="mt-6 max-w-160">
          <InviteOperatorForm />
        </div>
      </section>

      <div className="border-stone-deep mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 border-b pb-4">
        <nav aria-label="Account filters" className="flex flex-wrap gap-5">
          {[
            ['/admin/users', 'All'],
            ['/admin/users?state=active', 'Active'],
            ['/admin/users?state=suspended', 'Suspended'],
            ['/admin/users?role=judge', 'Judges'],
            ['/admin/users?role=admin', 'Admins'],
          ].map(([href, label]) => (
            <Link key={href} href={href!} className="palma-label text-taupe-deep hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>

        <form action="/admin/users" className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
          <label htmlFor="q" className="sr-only">
            Search accounts
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Email or name"
            className="border-stone-deep bg-ivory-bright text-ink placeholder:text-taupe focus:border-olive h-10 w-full min-w-0 border px-3 text-sm focus:outline-none sm:w-52"
          />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          className="mt-12"
          title="No accounts"
          description="Nothing matches this view."
        />
      ) : (
        <div className="mt-6 flex flex-col gap-px">
          {accounts.map((account) => (
            <article key={account.id} className="border-stone-deep border p-6">
              <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
                <div className="min-w-0 lg:col-span-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display min-w-0 text-xl break-all">{account.email}</h2>
                    <Badge variant={account.isActive ? 'olive' : 'muted'}>
                      {account.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                    <Badge variant="muted">{account.role.replace('_', ' ')}</Badge>
                  </div>

                  <dl className="mt-4 flex flex-col gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-taupe">Name</dt>
                      <dd className="text-right">{account.name}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-taupe">Email verified</dt>
                      <dd className="text-right">{account.emailVerified ? 'Yes' : 'No'}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-taupe">Created</dt>
                      <dd className="text-right">{formatDate(account.createdAt)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-taupe">Last sign-in</dt>
                      <dd className="text-right">
                        {account.lastLoginAt ? formatDate(account.lastLoginAt) : 'Never'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-taupe">Active sessions</dt>
                      <dd className="text-right tabular-nums">{account.activeSessions}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-taupe">Creator record</dt>
                      <dd className="text-right">
                        {account.creator ? (
                          <Link
                            href={`/portal/creators/${account.creator.slug}`}
                            className="palma-link text-ink"
                          >
                            {account.creator.displayName}
                          </Link>
                        ) : (
                          <span className="text-taupe">None</span>
                        )}
                      </dd>
                    </div>
                    {account.isJudge ? (
                      <div className="flex justify-between gap-4">
                        <dt className="text-taupe">Panel</dt>
                        <dd className="text-right">Seated as a judge</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                <div className="lg:col-span-4">
                  <RoleForm userId={account.id} role={account.role} />
                </div>

                <div className="flex flex-col gap-4 lg:col-span-3">
                  <AccountStateForm userId={account.id} isActive={account.isActive} />
                  <RevokeSessionsForm userId={account.id} count={account.activeSessions} />
                  {account.role !== 'creator' ? <IssueResetLinkForm userId={account.id} /> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Notice className="mt-12" title="What this screen cannot do">
        Nobody changes their own role or suspends their own account. Only a super administrator
        grants or removes that role. A permanent ban is not here at all. It goes through{' '}
        <Link href="/admin/enforcement" className="palma-link text-ink">
          enforcement
        </Link>
        , where a second administrator has to approve it.
      </Notice>
    </>
  );
}
