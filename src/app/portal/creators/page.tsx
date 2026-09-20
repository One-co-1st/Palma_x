import Link from 'next/link';
import { EmptyState } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { listCreatorRecords } from '@/server/data/operations';
import { countryName } from '@/lib/format';
import { titleCase } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Creator records',
  description: 'The creator records PALMA maintains.',
  path: '/portal/creators',
  noIndex: true,
});

export default async function CreatorRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const session = await requirePermission('creators:view_records', '/portal/creators');
  const { q, filter } = await searchParams;

  const records = await listCreatorRecords({
    query: q,
    claimed: filter === 'claimed' ? true : filter === 'unclaimed' ? false : undefined,
  });

  const shown = filter === 'unpublished' ? records.filter((r) => !r.isPublished) : records;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className="palma-label text-taupe-deep">Content</span>
          <h1 className="text-4xl">Creator records</h1>
          <p className="text-taupe-deep max-w-160 leading-relaxed">
            A PALMA record exists before the creator has an account. PALMA writes it, publishes it,
            and invites the creator to claim it.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {can(session.user.role, 'editorial:import_creators') ? (
            <Button asChild variant="outline" size="md">
              <Link href="/portal/creators/import">Import a list</Link>
            </Button>
          ) : null}
          {can(session.user.role, 'editorial:create_creator') ? (
            <Button asChild size="md">
              <Link href="/portal/creators/new">Add creator</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="border-stone-deep mt-10 flex flex-wrap items-center gap-6 border-b pb-4">
        <nav aria-label="Record filters" className="flex flex-wrap gap-6">
          {[
            ['/portal/creators', 'All'],
            ['/portal/creators?filter=unclaimed', 'Unclaimed'],
            ['/portal/creators?filter=claimed', 'Claimed'],
            ['/portal/creators?filter=unpublished', 'Unpublished'],
          ].map(([href, label]) => (
            <Link key={href} href={href!} className="palma-label text-taupe-deep hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>

        <form
          action="/portal/creators"
          className="flex min-w-0 flex-1 items-center gap-2 sm:ml-auto sm:flex-none"
        >
          <label htmlFor="q" className="sr-only">
            Search records
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search by name"
            className="border-stone-deep bg-ivory-bright text-ink placeholder:text-taupe focus:border-olive h-10 w-full min-w-0 border px-3 text-sm focus:outline-none sm:w-48"
          />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
      </div>

      {shown.length === 0 ? (
        <EmptyState className="mt-12" title="No records" description="Nothing matches this view." />
      ) : (
        <ul className="mt-4 flex flex-col">
          {shown.map((record) => (
            <li key={record.id}>
              <Link
                href={`/portal/creators/${record.slug}`}
                className="palma-row border-stone-deep grid gap-3 border-b py-5 sm:grid-cols-12 sm:items-baseline sm:gap-6"
              >
                <span className="sm:col-span-4">
                  <span className="palma-row-lead font-display block text-xl">
                    {record.displayName}
                  </span>
                  <span className="text-taupe mt-1 block text-xs">
                    {countryName(record.countryCode)}
                  </span>
                </span>

                <span className="text-taupe-deep text-sm sm:col-span-2">
                  {record.honourCount} honour{record.honourCount === 1 ? '' : 's'}
                </span>

                <span className="text-taupe-deep text-sm sm:col-span-2">
                  {titleCase(record.verificationStatus)}
                </span>

                <span className="flex flex-wrap gap-2 sm:col-span-4 sm:justify-end">
                  {record.openClaims > 0 ? (
                    <Badge variant="olive">
                      {record.openClaims} claim{record.openClaims === 1 ? '' : 's'}
                    </Badge>
                  ) : null}
                  {record.isSuspended ? <Badge variant="muted">Suspended</Badge> : null}
                  {!record.isPublished ? <Badge variant="muted">Unpublished</Badge> : null}
                  <Badge variant={record.isClaimed ? 'olive' : 'muted'}>
                    {record.isClaimed ? 'Claimed' : 'Unclaimed'}
                  </Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
