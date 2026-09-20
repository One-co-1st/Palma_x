import Link from 'next/link';
import { after } from 'next/server';
import { Container, Section } from '@/components/palma/layout';
import { Reveal } from '@/components/palma/Reveal';
import { Masthead } from '@/components/palma/Masthead';
import { CreatorCard } from '@/components/palma/CreatorCard';
import { EmptyState } from '@/components/ui/feedback';
import { Input } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { listCountries, listCreators } from '@/server/data/queries';
import { countSearch } from '@/server/services/measurement';

export const revalidate = 900;

export const metadata = buildMetadata({
  title: 'Creators',
  description:
    'Creators in the PALMA record: professional achievement records for the people shaping creator culture.',
  path: '/creators',
});

type Props = { searchParams: Promise<{ q?: string; country?: string; honours?: string }> };

export default async function CreatorsPage({ searchParams }: Props) {
  const filters = await searchParams;
  const honoursOnly = filters.honours === '1';

  const [creators] = await Promise.all([
    listCreators({ query: filters.q, country: filters.country, honoursOnly, limit: 120 }),
    listCountries(),
  ]);

  // As on the Roll of Honour: the term and the result count, nothing else.
  if (filters.q) {
    const term = filters.q;
    const found = creators.length;
    after(() => countSearch('creators', term, found));
  }

  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, ...patch })) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return query ? `/creators?${query}` : '/creators';
  };

  return (
    <>
      <Masthead
        eyebrow={'The record'}
        title="Creators"
        standfirst="A PALMA profile is an achievement record, not a social profile. No follower counts, no feed, no commentary, only what the panel conferred."
        meta={['No follower counts', 'No feed', 'No commentary']}
        size="compact"
      />

      <div className="border-stone-deep bg-ivory border-b">
        <Container className="flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {/* No country chips. Where a creator works is on their card and
                on their record, which is where a fact about one person
                belongs; a row of chips built from whoever happens to be in the
                archive turns two or three countries into a category the
                institution never meant to create. */}
            <Link
              href={href({ honours: honoursOnly ? undefined : '1' })}
              data-active={honoursOnly}
              className={cn(
                'palma-chip palma-label rounded-full border px-3.5 py-2',
                honoursOnly
                  ? 'border-champagne-deep bg-champagne/20 text-ink'
                  : 'border-stone-deep text-taupe-deep hover:border-ink/40 hover:text-ink',
              )}
            >
              Honoured only
            </Link>
          </div>

          <form action="/creators" role="search" className="flex items-center gap-2">
            {filters.country ? (
              <input type="hidden" name="country" value={filters.country} />
            ) : null}
            {honoursOnly ? <input type="hidden" name="honours" value="1" /> : null}
            <label htmlFor="creator-search" className="sr-only">
              Search creators
            </label>
            <Input
              id="creator-search"
              name="q"
              type="search"
              defaultValue={filters.q ?? ''}
              placeholder="Search creators"
              className="h-11 w-full lg:w-64"
            />
            <Button type="submit" size="sm" variant="outline">
              Search
            </Button>
          </form>
        </Container>
      </div>

      <Section>
        <Container>
          {creators.length === 0 ? (
            <EmptyState
              title="No creators match that search"
              description="Only published, verified creator profiles appear in the PALMA record."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/creators">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {creators.map((creator, index) => (
                <Reveal key={creator.slug} delay={(index % 4) * 70}>
                  <CreatorCard creator={creator} priority={index < 4} />
                </Reveal>
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
