import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';
import { Container, Section } from '@/components/palma/layout';
import { PalmaSeal } from '@/components/brand/PalmaSeal';
import { CopyLink, CopyMark } from '@/components/palma/CopyLink';
import { EditorialImage } from '@/components/palma/EditorialImage';
import { Button } from '@/components/ui/button';
import { HONOUR_LABEL } from '@/components/palma/badges';
import { achievementSlug, isThePalma } from '@/domain/honours';
import { JsonLd, absoluteUrl, awardJsonLd, buildMetadata } from '@/lib/seo';
import { countryName } from '@/lib/format';
import { getCreatorAchievement } from '@/server/data/queries';

export const revalidate = 900;

type Params = { params: Promise<{ slug: string; honour: string }> };

/**
 * One honour, at an address a person can say out loud.
 *
 * `/creators/maya-rivers/the-palma-2027`. A verification code proves a thing
 * but cannot be quoted: nobody reads `PM-2027-0042` down a phone or puts it in
 * a bio without explaining it first. This is the form that goes in a link
 * tree, a press kit, an email signature or a media pack, and it says what it is
 * before anybody clicks it.
 *
 * It is a second door onto the same record rather than a second record. The
 * page reads the same rows the creator's profile reads, through the same
 * cache, so the two can never disagree about what somebody holds. The
 * verification code is on the page and the verify link is one click away,
 * because the code is still the canonical proof.
 *
 * A revoked honour resolves rather than 404s, and says it was revoked. Links
 * already printed in somebody's press kit have to keep resolving; going blank
 * would be the institution pretending a thing it did never happened.
 */
export async function generateMetadata({ params }: Params) {
  const { slug, honour: honourSlug } = await params;
  const found = await getCreatorAchievement(slug, honourSlug);

  if (!found) {
    return buildMetadata({
      title: 'Honour',
      description: 'A PALMA honour.',
      path: `/creators/${slug}/${honourSlug}`,
      noIndex: true,
    });
  }

  const { creator, honour } = found;
  const what = isThePalma(honour.kind) ? 'THE PALMA' : honour.categoryName;

  return buildMetadata({
    title: `${creator.displayName}, ${what} ${honour.year}`,
    description: `${creator.displayName} holds ${HONOUR_LABEL[honour.kind]}${
      isThePalma(honour.kind) ? '' : `, ${honour.categoryName}`
    }, PALMA ${honour.year}. A verified PALMA record.`,
    path: `/creators/${creator.slug}/${honourSlug}`,
  });
}

export default async function AchievementPage({ params }: Params) {
  const { slug, honour: honourSlug } = await params;
  const found = await getCreatorAchievement(slug, honourSlug);
  if (!found) notFound();

  const { creator, honour } = found;
  const revoked = honour.state === 'revoked';
  const what = isThePalma(honour.kind) ? 'THE PALMA' : honour.categoryName;
  const shareUrl = absoluteUrl(
    `/creators/${creator.slug}/${achievementSlug(honour.kind, honour.categorySlug, honour.year)}`,
  );

  return (
    <>
      <section className="on-ink bg-ink text-ivory relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="border-champagne/25 pointer-events-none absolute inset-3 border sm:inset-5"
        />

        <Container className="relative py-20 sm:py-28">
          <div className="grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-16">
            <div className="flex flex-col gap-8 lg:col-span-7">
              <div className="flex flex-col gap-3">
                <span className="palma-label text-champagne text-[0.8125rem] tracking-[0.3em]">
                  {HONOUR_LABEL[honour.kind]}
                </span>
                <span className="text-ivory/45 text-sm tracking-[0.2em] uppercase">
                  {/* THE PALMA's honour and its "category" are the same words,
                      so naming both says it twice. */}
                  {isThePalma(honour.kind)
                    ? `PALMA ${honour.year}`
                    : `${what} · PALMA ${honour.year}`}
                </span>
              </div>

              <h1 className="font-display text-[clamp(2.5rem,10vw,6.5rem)] leading-[0.9] tracking-tight">
                {creator.displayName}
              </h1>

              {revoked ? (
                <p className="border-champagne/25 text-ivory/70 border-t pt-8 leading-relaxed">
                  This honour was revoked. The record is kept rather than deleted, because a
                  register that quietly loses entries cannot be checked.
                </p>
              ) : (
                <div className="border-champagne/25 flex flex-col gap-6 border-t pt-8">
                  {honour.citation ? (
                    <p className="font-display text-ivory/80 max-w-150 text-lg leading-relaxed text-balance">
                      {honour.citation}
                    </p>
                  ) : null}

                  <p className="palma-label text-champagne inline-flex items-center gap-2">
                    <BadgeCheck className="size-4" aria-hidden="true" />
                    Verified PALMA achievement
                  </p>

                  {/* The two things a creator came here to do: prove it, and
                      take the link away with them. */}
                  <div className="flex flex-wrap items-center gap-3">
                    {honour.code ? (
                      <Button asChild size="md" variant="ivory">
                        <Link href={`/verify/${honour.code}`}>Check the record</Link>
                      </Button>
                    ) : null}
                    <CopyLink value={shareUrl} label="Copy this link" variant="quiet" />
                  </div>

                  {honour.code ? (
                    <p className="text-ivory/40 flex items-center gap-1.5 font-mono text-xs tracking-wider">
                      {honour.code}
                      <CopyMark
                        value={honour.code}
                        label="Copy the verification code"
                        className="text-ivory/40 hover:text-ivory"
                      />
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-8 lg:col-span-5">
              <PalmaSeal
                legend={`PALMA ${honour.year}`}
                sublegend="THE CREATOR HONOURS"
                centre={
                  isThePalma(honour.kind)
                    ? 'Laureate'
                    : honour.kind === 'winner'
                      ? 'Winner'
                      : 'Finalist'
                }
                className={`h-44 w-44 ${revoked ? 'text-ivory/20' : 'text-champagne/90'}`}
              />
            </div>
          </div>
        </Container>
      </section>

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Link href={`/creators/${creator.slug}`} className="group block max-w-80">
                <EditorialImage
                  name={creator.displayName}
                  src={creator.portraitUrl}
                  alt={creator.portraitAlt}
                  ratio="portrait"
                />
                <span className="palma-label text-taupe-deep group-hover:text-ink mt-4 block transition-colors">
                  The full record
                </span>
              </Link>
            </div>

            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-8">
              <div className="border-stone-deep flex flex-col gap-2 border-t pt-5">
                <dt className="palma-label text-taupe-deep">Honour</dt>
                <dd className="font-display text-xl">{HONOUR_LABEL[honour.kind]}</dd>
              </div>
              <div className="border-stone-deep flex flex-col gap-2 border-t pt-5">
                <dt className="palma-label text-taupe-deep">
                  {isThePalma(honour.kind) ? 'Conferred for' : 'Category'}
                </dt>
                <dd className="font-display text-xl">
                  {isThePalma(honour.kind) ? (
                    <Link href="/the-palma" className="hover:text-olive">
                      A career
                    </Link>
                  ) : (
                    <Link
                      href={`/categories/${honour.categorySlug}?year=${honour.year}`}
                      className="hover:text-olive"
                    >
                      {honour.categoryName}
                    </Link>
                  )}
                </dd>
              </div>
              <div className="border-stone-deep flex flex-col gap-2 border-t pt-5">
                <dt className="palma-label text-taupe-deep">Season</dt>
                <dd className="font-display text-xl">PALMA {honour.year}</dd>
              </div>
              <div className="border-stone-deep flex flex-col gap-2 border-t pt-5">
                <dt className="palma-label text-taupe-deep">Country</dt>
                <dd className="font-display text-xl">{countryName(creator.countryCode)}</dd>
              </div>
            </dl>
          </div>
        </Container>
      </Section>

      {!revoked ? (
        <JsonLd
          data={awardJsonLd({
            creatorName: creator.displayName,
            creatorUrl: absoluteUrl(`/creators/${creator.slug}`),
            categoryName: what,
            year: honour.year,
            kind: HONOUR_LABEL[honour.kind],
            code: honour.code,
          })}
        />
      ) : null}
    </>
  );
}
