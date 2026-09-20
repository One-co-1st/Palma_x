import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/palma/layout';
import { Masthead } from '@/components/palma/Masthead';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/primitives';
import { Badge } from '@/components/ui/badge';
import { buildMetadata } from '@/lib/seo';
import { PRODUCT_CATEGORIES, verdictReading } from '@/domain/product-library';
import { listPublishedProducts } from '@/server/data/product-library';
import { featureLive } from '@/server/features';

export const revalidate = 900;

export const metadata = buildMetadata({
  title: 'The Product Library',
  description:
    'A short, curated list of products genuinely relevant to creators, each with a PALMA verdict, its strengths and its limitations. No affiliate links, ever.',
  path: '/kulture/products',
});

/**
 * The Product Library, in public.
 *
 * Returns a 404 rather than an empty page when the feature is off, because a
 * page that exists and says "coming soon" is a page advertising something that
 * does not exist.
 */
export default async function ProductLibraryPage() {
  if (!(await featureLive('product_library'))) notFound();

  const entries = await listPublishedProducts();

  return (
    <>
      <Masthead
        eyebrow={
          <>
            <Link href="/kulture" className="palma-link">
              Kulture
            </Link>
            {' · '}
            The Product Library
          </>
        }
        title="The Product Library"
        titleLines={['The Product', 'Library']}
        standfirst="Things creators actually use, looked at honestly. Short on purpose."
        meta={[`${entries.length} entries`, 'No affiliate links', 'Verdicts written by PALMA']}
      />

      <Section className="py-14 sm:py-18">
        <Container>
          <Reveal>
            <div className="border-champagne-deep bg-stone/40 max-w-200 border-l-2 p-7">
              <h2 className="palma-label text-taupe-deep">How to read this</h2>
              <p className="text-taupe-deep mt-4 leading-relaxed">
                Every entry carries a verdict, what it is best for, and what it is not good for.
                PALMA takes no commission and publishes no affiliate links: an outbound link here
                cannot carry a tracking parameter, so nobody earns anything when you click it.
              </p>
              <p className="text-taupe-deep mt-3 leading-relaxed">
                Where a brand is a PALMA partner, the entry says so on its face. Partnership pays
                for a place in the Library. It does not affect the verdict, the strengths or the
                limitations, and partners do not see an entry before it is published.
              </p>
            </div>
          </Reveal>

          {entries.length === 0 ? (
            <p className="text-taupe-deep mt-12 max-w-160 leading-relaxed">
              Nothing published yet.
            </p>
          ) : (
            PRODUCT_CATEGORIES.map((category) => {
              const inCategory = entries.filter((entry) => entry.category === category.key);
              if (inCategory.length === 0) return null;

              return (
                <section key={category.key} className="mt-16">
                  <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
                    {category.label}
                  </h2>
                  <p className="text-taupe mt-3 text-sm">{category.note}</p>

                  <RevealGroup className="mt-8 flex flex-col gap-10">
                    {inCategory.map((entry) => (
                      <RevealItem key={entry.slug}>
                        <article className="border-stone-deep border p-7 sm:p-9">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                              <span className="palma-label text-taupe-deep">{entry.brand}</span>
                              <h3 className="font-display mt-1 text-2xl leading-tight sm:text-3xl">
                                {entry.name}
                              </h3>
                            </div>
                            {entry.verdict !== null ? (
                              <div className="text-right">
                                <span className="font-display block text-4xl leading-none tabular-nums">
                                  {entry.verdict.toFixed(1)}
                                </span>
                                <span className="palma-label text-taupe mt-1 block">
                                  PALMA verdict
                                </span>
                              </div>
                            ) : null}
                          </div>

                          {entry.verdict !== null ? (
                            <p className="text-taupe-deep mt-4 text-sm">
                              {verdictReading(entry.verdict)}
                            </p>
                          ) : null}

                          {entry.bestFor ? (
                            <p className="font-display border-olive/40 mt-6 border-l-2 pl-5 text-lg leading-snug">
                              Best for: {entry.bestFor}
                            </p>
                          ) : null}

                          <div className="mt-7 grid gap-8 sm:grid-cols-2">
                            <div>
                              <h4 className="palma-label text-taupe-deep">Strengths</h4>
                              <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed">
                                {entry.strengths.map((item) => (
                                  <li key={item} className="text-taupe-deep">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="palma-label text-taupe-deep">Limitations</h4>
                              <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed">
                                {entry.limitations.map((item) => (
                                  <li key={item} className="text-taupe-deep">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <p className="text-ink/85 mt-7 leading-relaxed">{entry.review}</p>

                          <div className="border-stone-deep mt-7 flex flex-wrap items-center gap-4 border-t pt-6">
                            {entry.externalUrl ? (
                              <a
                                href={entry.externalUrl}
                                rel="noopener noreferrer nofollow"
                                target="_blank"
                                className="palma-link text-ink"
                              >
                                Where to find it
                              </a>
                            ) : null}
                            {entry.testedBy ? (
                              <span className="text-taupe text-sm">Tested by {entry.testedBy}</span>
                            ) : null}
                            {entry.disclosure ? <Badge variant="muted">PALMA partner</Badge> : null}
                          </div>

                          {entry.disclosure ? (
                            <p className="text-taupe mt-4 text-xs leading-relaxed">
                              {entry.disclosure}
                            </p>
                          ) : null}
                        </article>
                      </RevealItem>
                    ))}
                  </RevealGroup>
                </section>
              );
            })
          )}
        </Container>
      </Section>
    </>
  );
}
