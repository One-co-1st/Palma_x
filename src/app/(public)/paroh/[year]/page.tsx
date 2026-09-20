import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { Masthead } from '@/components/palma/Masthead';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { PalmaSeal } from '@/components/brand/PalmaSeal';
import { JsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { countryName, formatDate } from '@/lib/format';
import { getRollOfHonour, getSeason, listSeasons } from '@/server/data/queries';

export const revalidate = 900;

type Params = { params: Promise<{ year: string }> };

export async function generateStaticParams() {
  const seasons = await listSeasons();
  return seasons.map((season) => ({ year: String(season.year) }));
}

export async function generateMetadata({ params }: Params) {
  const { year } = await params;
  return buildMetadata({
    title: `PaROH, Class of ${year}`,
    description: `The PALMA Roll of Honour, class of ${year}. The permanent record of every PALMA conferred in the ${year} season.`,
    path: `/paroh/${year}`,
  });
}

export default async function ParohYearPage({ params }: Params) {
  const { year } = await params;
  const yearNumber = Number(year);
  if (!Number.isInteger(yearNumber)) notFound();

  const season = await getSeason(yearNumber);
  if (!season) notFound();

  const roll = await getRollOfHonour({ year: yearNumber });
  const entries = roll[0]?.entries ?? [];

  return (
    <>
      <Masthead
        eyebrow="PALMA Roll of Honour"
        title={`Class of ${season.year}`}
        titleLines={['Class of', String(season.year)]}
        figure={season.year}
        standfirst={
          entries.length > 0
            ? `${entries.length} honours conferred at the ${season.title} ceremony on ${formatDate(season.ceremonyAt)}.`
            : undefined
        }
        meta={[
          entries.length > 0 ? `${entries.length} honours` : 'Not yet conferred',
          'Permanent and publicly verifiable',
        ]}
        actions={
          <Link href="/paroh" className="palma-label-brand palma-link text-ivory/70">
            ← The full PaROH
          </Link>
        }
      />

      <Section>
        <Container>
          {entries.length === 0 ? (
            <EmptyState
              title={`The ${season.year} class is not yet complete`}
              description="Honours are entered into the Roll of Honour at the ceremony."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/paroh" className="palma-label-brand">
                    View the PaROH
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-16 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <ul>
                  {entries.map((entry) => (
                    <li key={entry.categorySlug}>
                      <Link
                        href={`/creators/${entry.creator.slug}`}
                        className="group border-stone-deep hover:bg-stone/25 flex flex-col gap-2 border-b py-7 transition-colors sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                      >
                        <span className="flex flex-col gap-2">
                          <span className="palma-label text-taupe-deep">{entry.categoryName}</span>
                          <span className="font-display text-3xl leading-tight sm:text-4xl">
                            {entry.creator.displayName}
                          </span>
                          {entry.citation ? (
                            <span className="text-taupe-deep max-w-120 text-sm leading-relaxed">
                              {entry.citation}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 flex-col gap-1.5 sm:items-end">
                          <span className="palma-label text-taupe">
                            {countryName(entry.creator.countryCode)}
                          </span>
                          {entry.code ? (
                            <span className="text-taupe-deep font-mono text-xs tracking-wider">
                              {entry.code}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <aside className="flex flex-col items-center gap-8 lg:col-span-4">
                <PalmaSeal
                  legend={`PALMA ${season.year}`}
                  sublegend="ROLL OF HONOUR"
                  className="text-olive h-48 w-48"
                />
                <p className="palma-annotation text-olive">and what a year it was</p>
                <p className="text-taupe-deep max-w-72 text-center text-sm leading-relaxed">
                  Each honour in this class carries a permanent verification record. A PALMA can be
                  checked by anyone, at any time, from the code printed on the certificate.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/verify">Verify an honour</Link>
                </Button>
              </aside>
            </div>
          )}
        </Container>
      </Section>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'PALMA Roll of Honour', path: '/paroh' },
          { name: `Class of ${season.year}`, path: `/paroh/${season.year}` },
        ])}
      />
    </>
  );
}
