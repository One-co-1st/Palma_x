import Link from 'next/link';
import { after } from 'next/server';
import { Container, Section } from '@/components/palma/layout';
import { EmptyState } from '@/components/ui/feedback';
import { Input } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { PalmMark } from '@/components/brand/PalmMark';
import { InkFill } from '@/components/motion/illusion';
import { buildMetadata } from '@/lib/seo';
import { countryName } from '@/lib/format';
import { cn } from '@/lib/utils';
import { pigmentStyle } from '@/lib/category-identity';
import { getRollOfHonour, listCategoryIndex, listSeasons } from '@/server/data/queries';
import { countSearch } from '@/server/services/measurement';
import { LaureatePlate } from '@/components/palma/TheLaureate';
import { Reveal } from '@/components/palma/Reveal';

export const revalidate = 900;

export const metadata = buildMetadata({
  title: 'PALMA Roll of Honour',
  description:
    'The PaROH, the permanent record of PALMA recipients. Every honour, every season, filterable by year, category and creator.',
  path: '/paroh',
});

type Props = {
  searchParams: Promise<{ year?: string; category?: string; country?: string; q?: string }>;
};

function filterHref(
  base: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...patch })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/paroh?${query}` : '/paroh';
}

export default async function ParohPage({ searchParams }: Props) {
  const filters = await searchParams;
  const [seasons, categories] = await Promise.all([listSeasons(), listCategoryIndex()]);

  const roll = await getRollOfHonour({
    year: filters.year ? Number(filters.year) : undefined,
    category: filters.category,
    country: filters.country,
    query: filters.q,
  });

  const total = roll.reduce((sum, group) => sum + group.entries.length, 0);
  const filtered = Boolean(filters.year || filters.category || filters.country || filters.q);

  // What the archive was asked for, and whether it had it. The term only —
  // never who asked. A search returning nothing is the useful row: it is PALMA
  // being asked for something it does not hold.
  if (filters.q) {
    const term = filters.q;
    after(() => countSearch('paroh', term, total));
  }

  return (
    <>
      <header className="on-ink border-ink bg-ink text-ivory relative overflow-hidden border-b">
        <PalmMark className="text-ivory/[0.035] sm:text-ivory/[0.05] pointer-events-none absolute -top-4 -right-20 h-64 sm:top-6 sm:-right-16 sm:h-110" />
        <Container className="relative py-20 sm:py-28">
          <div className="flex max-w-200 flex-col gap-8">
            <span className="palma-label-brand text-champagne">PaROH</span>
            <InkFill as="h1" className="text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">
              {'PALMA Roll of Honour'}
            </InkFill>
            <p className="text-ivory/70 max-w-130 text-lg leading-relaxed">
              The permanent record of PALMA recipients. {total} {total === 1 ? 'honour' : 'honours'}{' '}
              held across {seasons.filter((s) => s.stage === 'archived').length || seasons.length}{' '}
              seasons.
            </p>
          </div>
        </Container>
      </header>

      {/* Not sticky, deliberately.
          It was, and the arithmetic was never going to work: twelve category
          chips, four years and a search box come to 619 pixels, which on a
          phone is eighty per cent of the screen pinned in place. Scrolling
          moved the records through a 150-pixel slot underneath a filter bar
          that would not go away. A control surface taller than the content it
          controls is not navigation, it is a lid. It scrolls off like
          everything else now, and the way back to it is the way back to
          anything, upwards. */}
      <div className="border-stone-deep bg-ivory border-b">
        <Container className="flex flex-col gap-4 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="palma-label text-taupe-deep mr-2">Year</span>
            <Link
              href={filterHref(filters, { year: undefined })}
              data-active={!filters.year}
              className={cn(
                'palma-chip palma-label rounded-full border px-3.5 py-2',
                !filters.year
                  ? 'border-ink bg-ink text-ivory'
                  : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
              )}
            >
              All
            </Link>
            {seasons.map((season) => (
              <Link
                key={season.year}
                href={filterHref(filters, { year: String(season.year) })}
                data-active={filters.year === String(season.year)}
                className={cn(
                  'palma-chip palma-label rounded-full border px-3.5 py-2',
                  filters.year === String(season.year)
                    ? 'border-ink bg-ink text-ivory'
                    : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
                )}
              >
                {season.year}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="palma-label text-taupe-deep mr-2">Category</span>
              <Link
                href={filterHref(filters, { category: undefined })}
                data-active={!filters.category}
                className={cn(
                  'palma-chip palma-label rounded-full border px-3.5 py-2',
                  !filters.category
                    ? 'border-ink bg-ink text-ivory'
                    : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
                )}
              >
                All
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={filterHref(filters, { category: category.slug })}
                  data-active={filters.category === category.slug}
                  className={cn(
                    'palma-chip palma-label rounded-full border px-3.5 py-2',
                    filters.category === category.slug
                      ? 'border-ink bg-ink text-ivory'
                      : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
                  )}
                >
                  {category.name}
                </Link>
              ))}
            </div>

            <form action="/paroh" className="flex items-center gap-2" role="search">
              {filters.year ? <input type="hidden" name="year" value={filters.year} /> : null}
              {filters.category ? (
                <input type="hidden" name="category" value={filters.category} />
              ) : null}
              <label htmlFor="paroh-search" className="sr-only">
                Search the Roll of Honour
              </label>
              <Input
                id="paroh-search"
                name="q"
                type="search"
                defaultValue={filters.q ?? ''}
                placeholder="Creator or category"
                className="h-11 w-full lg:w-64"
              />
              <Button type="submit" size="sm" variant="outline">
                Search
              </Button>
            </form>
          </div>
        </Container>
      </div>

      <Section className="py-16 sm:py-20">
        <Container>
          {roll.length === 0 ? (
            <EmptyState
              title="No honours match that filter"
              description="The Roll of Honour holds only conferred honours. Try widening the year or category."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/paroh">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-20">
              {roll.map((group) => (
                <Reveal key={group.year}>
                  <section aria-labelledby={`paroh-${group.year}`}>
                    <div className="border-ink/15 flex items-end justify-between gap-6 border-b pb-5">
                      <h2 id={`paroh-${group.year}`} className="text-5xl leading-none sm:text-6xl">
                        {group.year}
                      </h2>
                      <Link
                        href={`/paroh/${group.year}`}
                        className="palma-label text-taupe-deep hover:text-ink transition-colors"
                      >
                        Class of {group.year} →
                      </Link>
                    </div>

                    {group.laureate ? <LaureatePlate laureate={group.laureate} /> : null}

                    <ul className="mt-2">
                      {group.entries.map((entry) => (
                        <li
                          key={`${entry.year}-${entry.categorySlug}`}
                          style={pigmentStyle(entry.categorySlug)}
                        >
                          <Link
                            href={`/creators/${entry.creator.slug}`}
                            className="palma-row group/card border-stone-deep hover:bg-stone/25 grid grid-cols-1 items-baseline gap-1 border-b py-6 sm:grid-cols-12 sm:gap-6"
                          >
                            <span className="palma-label palma-pigment-text sm:col-span-5">
                              {entry.categoryName}
                            </span>
                            <span className="palma-row-lead font-display text-2xl leading-tight sm:col-span-5 sm:text-3xl">
                              {entry.creator.displayName}
                            </span>
                            <span className="palma-label text-taupe sm:col-span-2 sm:text-right">
                              {countryName(entry.creator.countryCode)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                </Reveal>
              ))}
            </div>
          )}

          {filtered ? (
            <p className="text-taupe-deep mt-12 text-sm">
              Showing {total} {total === 1 ? 'honour' : 'honours'} ·{' '}
              <Link href="/paroh" className="palma-link hover:text-ink">
                Clear filters
              </Link>
            </p>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
