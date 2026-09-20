import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { Masthead } from '@/components/palma/Masthead';
import { SeasonRail } from '@/components/palma/SeasonRail';
import { EditorialImage } from '@/components/palma/EditorialImage';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/palma/Reveal';
import { buildMetadata } from '@/lib/seo';
import { winnersArePublic } from '@/domain/season';
import { TheLaureate } from '@/components/palma/TheLaureate';
import {
  getCurrentSeason,
  getSeason,
  getThePalma,
  listSeasonOutcomes,
  listSeasons,
} from '@/server/data/queries';

export const revalidate = 900;

export const metadata = buildMetadata({
  title: 'Winners',
  description:
    'PALMA winners by season: the creators who hold The Creator Honours, with a permanent verification record for each.',
  path: '/winners',
});

type Props = { searchParams: Promise<{ year?: string }> };

export default async function WinnersPage({ searchParams }: Props) {
  const { year } = await searchParams;
  const seasons = await listSeasons();
  const requested = year ? await getSeason(Number(year)) : null;
  const announced = seasons.find((season) => winnersArePublic(season.stage));
  const season = requested ?? announced ?? (await getCurrentSeason());

  const outcomes = winnersArePublic(season.stage) ? await listSeasonOutcomes(season.year) : [];
  // Asked for separately, and rendered before the grid rather than inside it.
  // THE PALMA is not one of the twelve and must never arrive through the same
  // loop that draws them.
  const laureate = winnersArePublic(season.stage) ? await getThePalma(season.year) : null;
  const winners = outcomes.filter((outcome) => outcome.winner);
  // A category that was contested and judged but not conferred. PALMA's rules
  // permit declining rather than lowering the standard, and a record that
  // silently omitted the category would hide the most telling thing about it.
  const declined = outcomes.filter((outcome) => !outcome.winner);

  return (
    <>
      <Masthead
        eyebrow={
          <Link href={`/awards/${season.year}`} className="palma-link">
            {season.title}
          </Link>
        }
        title="The winners"
        titleLines={['The', 'winners']}
        figure={season.year}
        standfirst={
          winners.length > 0
            ? 'Every winner below holds a permanent, verifiable PALMA record.'
            : undefined
        }
        meta={[
          winners.length > 0 ? `${winners.length} PALMAs conferred` : 'Not yet announced',
          ...(declined.length > 0
            ? [`${declined.length} not conferred`]
            : ['Each with a signed verification record']),
        ]}
        plate={
          seasons.length > 1 ? (
            <nav aria-label="Season" className="flex flex-wrap gap-2">
              {seasons.map((entry) => (
                <Link
                  key={entry.year}
                  href={`/winners?year=${entry.year}`}
                  data-active={entry.year === season.year}
                  aria-current={entry.year === season.year ? 'page' : undefined}
                  className={
                    entry.year === season.year
                      ? 'palma-label border-ivory bg-ivory text-ink rounded-full border px-4 py-2.5'
                      : 'palma-chip palma-label border-ivory/30 text-ivory/70 rounded-full border px-4 py-2.5'
                  }
                >
                  {entry.year}
                </Link>
              ))}
            </nav>
          ) : undefined
        }
      />

      {/* Finalists are a state of a season, not a destination of their own: the
          rail keeps the rest of the season one click away. */}
      <div className="border-stone-deep bg-ivory border-b">
        <Container className="py-10">
          <SeasonRail year={season.year} stage={season.stage} current="winners" tone="light" />
        </Container>
      </div>

      {laureate ? <TheLaureate laureate={laureate} seasonTitle={season.title} /> : null}

      <Section>
        <Container>
          {laureate && winners.length > 0 ? (
            <div className="mb-16 flex flex-col gap-3">
              <h2 className="palma-label text-taupe-deep">The Creator PALMAs</h2>
              <p className="text-taupe-deep max-w-160 text-sm leading-relaxed">
                Twelve, conferred in category by the panel.
              </p>
            </div>
          ) : null}

          {winners.length === 0 ? (
            <EmptyState
              title="Winners not yet announced"
              description={`${season.title} winners are announced at the ceremony. The Roll of Honour holds every previous season.`}
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/paroh" className="palma-label-brand">
                    Enter the PaROH
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
              {winners.map((outcome, index) => {
                const winner = outcome.winner!;
                return (
                  <Reveal key={outcome.category.slug} delay={index * 60}>
                    <Link
                      href={`/categories/${outcome.category.slug}?year=${season.year}`}
                      className="group flex flex-col gap-5"
                    >
                      <span className="palma-label border-stone-deep text-taupe-deep border-t pt-4">
                        {outcome.category.name}
                      </span>
                      <EditorialImage
                        name={winner.creator.displayName}
                        src={winner.creator.portraitUrl}
                        alt={winner.creator.portraitAlt}
                        ratio="square"
                      />
                      <div className="flex flex-col gap-2">
                        <h2 className="group-hover:text-olive text-2xl leading-tight transition-colors">
                          {winner.creator.displayName}
                        </h2>
                        <span className="palma-label text-champagne-deep">
                          PALMA {season.year} Winner
                        </span>
                        {winner.code ? (
                          <span className="text-taupe-deep font-mono text-xs tracking-wider">
                            {winner.code}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          )}

          {declined.length > 0 ? (
            <section className="border-stone-deep mt-20 border-t pt-12">
              <h2 className="palma-label text-taupe-deep">Contested, not conferred</h2>
              <p className="text-taupe-deep mt-4 max-w-160 leading-relaxed">
                The panel judged {declined.length === 1 ? 'this category' : 'these categories'} and
                recommended that no PALMA be conferred. Where a category receives too few
                candidacies that meet the standard, PALMA declines it rather than lower the standard
                , and says so, because an award conferred every year regardless means less every
                year.
              </p>

              <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                {declined.map((outcome) => (
                  <li key={outcome.category.slug}>
                    <Link
                      href={`/categories/${outcome.category.slug}?year=${season.year}`}
                      className="palma-row group/card border-stone-deep flex flex-col gap-2 border-t pt-4"
                    >
                      <span className="palma-row-lead font-display text-xl leading-tight">
                        {outcome.category.name}
                      </span>
                      <span className="palma-label text-taupe">No PALMA conferred</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
