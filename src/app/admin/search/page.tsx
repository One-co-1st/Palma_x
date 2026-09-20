import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { searchEverything } from '@/server/data/people';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Search',
  description: 'Search PALMA.',
  path: '/admin/search',
  noIndex: true,
});

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission('creators:view_records', '/admin/search');
  const { q } = await searchParams;

  const hits = q ? await searchEverything(q) : [];
  const grouped = new Map<string, typeof hits>();
  for (const hit of hits) grouped.set(hit.kind, [...(grouped.get(hit.kind) ?? []), hit]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Command centre</span>
        <h1 className="text-4xl">Search</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          One search across the institution. Creators, accounts, claims, verification cases, honours
          and the audit log. It works because there is one record per thing: a creator is the same
          row wherever you meet them.
        </p>
      </div>

      <form action="/admin/search" className="mt-10 flex max-w-160 flex-wrap items-center gap-3">
        <label htmlFor="q" className="sr-only">
          Search PALMA
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="A name, an email, a reference, a verification code"
          className="border-stone-deep bg-ivory-bright text-ink placeholder:text-taupe focus:border-olive h-12 min-w-0 flex-1 border px-4 text-sm focus:outline-none"
        />
        <Button type="submit" size="md">
          Search
        </Button>
      </form>

      {!q ? (
        <p className="text-taupe mt-10 text-sm">Type at least two characters.</p>
      ) : hits.length === 0 ? (
        <EmptyState
          className="mt-12"
          title={`Nothing matches “${q}”`}
          description="Try a shorter fragment, an email address, or a reference such as CL-2027-ABC123."
        />
      ) : (
        <div className="mt-12 flex flex-col gap-12">
          {[...grouped.entries()].map(([kind, entries]) => (
            <section key={kind}>
              <h2 className="palma-label text-taupe-deep border-stone-deep flex items-baseline justify-between border-b pb-3">
                {kind}
                <span className="text-taupe tabular-nums">{entries.length}</span>
              </h2>
              <ul className="flex flex-col">
                {entries.map((hit, index) => (
                  <li key={`${hit.href}-${index}`}>
                    <Link
                      href={hit.href}
                      className="palma-row border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3.5 last:border-none"
                    >
                      <span className="palma-row-lead font-display min-w-0 text-lg break-all">
                        {hit.title}
                      </span>
                      <span className="text-taupe-deep min-w-0 text-sm break-all">
                        {hit.detail}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
