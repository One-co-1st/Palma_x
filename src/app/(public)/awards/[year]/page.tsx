import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section, SectionHeading } from '@/components/palma/layout';
import { Masthead, MastheadPlate, PlateFact } from '@/components/palma/Masthead';
import { Button } from '@/components/ui/button';
import { SeasonChoreography } from '@/components/motion/SeasonChoreography';
import { CategoryCard } from '@/components/palma/CategoryCard';
import { EditorialImage } from '@/components/palma/EditorialImage';
import { JsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import {
  STAGE_LABEL,
  acceptsNominations,
  shortlistIsPublic,
  winnersArePublic,
} from '@/domain/season';
import { formatDate } from '@/lib/format';
import { getSeason, listCategories, listSeasonOutcomes, listSeasons } from '@/server/data/queries';

export const revalidate = 900;

type Params = { params: Promise<{ year: string }> };

export async function generateStaticParams() {
  const seasons = await listSeasons();
  return seasons.map((season) => ({ year: String(season.year) }));
}

export async function generateMetadata({ params }: Params) {
  const { year } = await params;
  const season = await getSeason(Number(year));
  if (!season) return buildMetadata({ title: 'Season', description: '', path: `/awards/${year}` });

  return buildMetadata({
    title: season.title,
    description:
      season.summary ??
      `${season.title}, the categories, finalists and winners of The Creator Honours.`,
    path: `/awards/${season.year}`,
  });
}

export default async function SeasonPage({ params }: Params) {
  const { year } = await params;
  const yearNumber = Number(year);
  if (!Number.isInteger(yearNumber)) notFound();

  const season = await getSeason(yearNumber);
  if (!season) notFound();

  const [categories, outcomes] = await Promise.all([
    listCategories(season.year),
    listSeasonOutcomes(season.year),
  ]);

  const open = acceptsNominations(season.stage);
  const winners = winnersArePublic(season.stage)
    ? outcomes.filter((outcome) => outcome.winner)
    : [];

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
        plate={
          <MastheadPlate label="This season">
            <dl className="grid grid-cols-2 gap-5">
              <PlateFact term="Stage">{STAGE_LABEL[season.stage]}</PlateFact>
              <PlateFact term="Categories">{categories.length}</PlateFact>
              <PlateFact term="Finalists named">{winners.length > 0 ? 'Yes' : 'Not yet'}</PlateFact>
              <PlateFact term="Winners">{winners.length || '—'}</PlateFact>
            </dl>
          </MastheadPlate>
        }
      />

      <Section id="shortlist" className="py-16">
        <Container>
          <h2 className="palma-label text-taupe-deep mb-8">The season</h2>
          <SeasonChoreography
            year={season.year}
            stage={season.stage}
            dates={[
              season.nominationsOpenAt,
              season.shortlistAt,
              season.finalistsAt,
              season.ceremonyAt,
            ]}
          />

          <p className="text-taupe-deep mt-10 max-w-160 text-sm leading-relaxed">
            {shortlistIsPublic(season.stage)
              ? 'The shortlist has been published. Each category below carries its own shortlist, finalists and, once the ceremony has taken place, its winner.'
              : 'Nominations are screened by a person, the panel scores what is eligible, and each stage is published on the date set out before the season opened.'}
          </p>
        </Container>
      </Section>

      {winners.length > 0 ? (
        <Section tone="ink">
          <Container>
            <SectionHeading
              label={`${season.year} winners`}
              title="The record of the season"
              className="[&_p]:text-ivory/60 [&_span]:text-champagne"
            />
            <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {winners.map((outcome) => (
                <Link
                  key={outcome.category.slug}
                  href={`/categories/${outcome.category.slug}?year=${season.year}`}
                  className="group flex flex-col gap-4"
                >
                  <EditorialImage
                    name={outcome.winner!.creator.displayName}
                    src={outcome.winner!.creator.portraitUrl}
                    alt={outcome.winner!.creator.portraitAlt}
                  />
                  <span className="palma-label text-champagne">{outcome.category.name}</span>
                  <span className="font-display text-2xl leading-tight">
                    {outcome.winner!.creator.displayName}
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      <Section tone="stone">
        <Container>
          <SectionHeading
            label="Categories"
            title={`${season.year} categories`}
            action={
              open ? (
                <Button asChild size="sm">
                  <Link href="/nominate">Nominate</Link>
                </Button>
              ) : undefined
            }
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <CategoryCard
                key={category.slug}
                category={category}
                index={index}
                href={`/categories/${category.slug}?year=${season.year}`}
              />
            ))}
          </div>
        </Container>
      </Section>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Awards', path: '/awards' },
          { name: season.title, path: `/awards/${season.year}` },
        ])}
      />
    </>
  );
}
