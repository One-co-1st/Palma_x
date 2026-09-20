import Link from 'next/link';
import { Container, Section, SectionHeading } from '@/components/palma/layout';
import { Reveal } from '@/components/palma/Reveal';
import { Masthead, MastheadPlate, PlateFact } from '@/components/palma/Masthead';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SeasonRail } from '@/components/palma/SeasonRail';
import { CategoryCard } from '@/components/palma/CategoryCard';
import { Timeline } from '@/components/palma/Timeline';
import { buildMetadata } from '@/lib/seo';
import { STAGE_LABEL, acceptsNominations } from '@/domain/season';
import { formatDate, formatShortDate } from '@/lib/format';
import { getCurrentSeason, listCategories, listSeasons } from '@/server/data/queries';

export const revalidate = 900;

export const metadata = buildMetadata({
  title: 'Awards',
  description:
    'The PALMA season: nominations, shortlist, finalists and winners across every contested category of The Creator Honours.',
  path: '/awards',
});

export default async function AwardsPage() {
  const [season, seasons] = await Promise.all([getCurrentSeason(), listSeasons()]);
  const categories = await listCategories(season.year);
  const open = acceptsNominations(season.stage);
  const past = seasons.filter((entry) => entry.year !== season.year);

  return (
    <>
      <Masthead
        eyebrow="The Creator Honours"
        title={season.title}
        titleLines={['PALMA', String(season.year)]}
        figure={season.year}
        standfirst={season.summary ?? undefined}
        meta={[
          STAGE_LABEL[season.stage],
          `${categories.length} categories`,
          `Ceremony ${formatDate(season.ceremonyAt)}`,
        ]}
        actions={
          open ? (
            <Button asChild variant="ivory" size="md">
              <Link href="/nominate">Nominate a creator</Link>
            </Button>
          ) : undefined
        }
        plate={
          <MastheadPlate label="The season at a glance">
            <dl className="grid grid-cols-2 gap-5">
              <PlateFact term="Nominations open">
                {formatShortDate(season.nominationsOpenAt)}
              </PlateFact>
              <PlateFact term="Nominations close">
                {formatShortDate(season.nominationsCloseAt)}
              </PlateFact>
              <PlateFact term="Shortlist">{formatShortDate(season.shortlistAt)}</PlateFact>
              <PlateFact term="Finalists">{formatShortDate(season.finalistsAt)}</PlateFact>
            </dl>
          </MastheadPlate>
        }
      />

      <Section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="palma-label text-taupe-deep">The season</h2>
              <SeasonRail year={season.year} stage={season.stage} tone="light" className="mt-8" />
            </div>

            <div className="lg:col-span-5">
              <h2 className="palma-label text-taupe-deep mb-8">Key dates</h2>
              <Timeline
                items={[
                  {
                    label: 'Nominations open',
                    date: season.nominationsOpenAt,
                    state: 'past',
                    description: 'Creators may nominate themselves, or be nominated by anyone.',
                  },
                  {
                    label: 'Nominations close',
                    date: season.nominationsCloseAt,
                    state: open ? 'current' : 'past',
                  },
                  {
                    label: 'Shortlist announced',
                    date: season.shortlistAt,
                    state: 'future',
                  },
                  { label: 'Finalists announced', date: season.finalistsAt, state: 'future' },
                  {
                    label: 'Winners announced',
                    date: season.ceremonyAt,
                    state: 'future',
                    description: 'Honours are entered into the PALMA Roll of Honour.',
                  },
                ]}
              />
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="stone">
        <Container>
          <SectionHeading
            label="Categories"
            title={`The ${season.year} categories`}
            standfirst="Each category carries its own eligibility rules and judging criteria. Judges are briefed to discount audience size in every one of them."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Reveal key={category.slug} delay={(index % 3) * 70}>
                <CategoryCard category={category} index={index} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {past.length > 0 ? (
        <Section>
          <Container>
            <SectionHeading label="Past seasons" title="Every season since the first" />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((entry) => (
                <Card key={entry.year} interactive>
                  <Link href={`/awards/${entry.year}`} className="flex flex-col gap-4 p-7">
                    <span className="palma-label text-taupe-deep">{STAGE_LABEL[entry.stage]}</span>
                    <h3 className="text-3xl">{entry.title}</h3>
                    {entry.tagline ? (
                      <p className="text-taupe-deep text-sm">{entry.tagline}</p>
                    ) : null}
                    <span className="palma-label text-olive mt-2">View the season →</span>
                  </Link>
                </Card>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
