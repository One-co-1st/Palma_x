import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Plus } from 'lucide-react';
import { Container, Section } from '@/components/palma/layout';
import { EditorialImage } from '@/components/palma/EditorialImage';
import { VerificationBadge, AchievementBadge } from '@/components/palma/badges';
import { CopyLink, CopyMark } from '@/components/palma/CopyLink';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { PalmaSeal } from '@/components/brand/PalmaSeal';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/primitives';
import { JsonLd, absoluteUrl, awardJsonLd, breadcrumbJsonLd, buildMetadata } from '@/lib/seo';
import { countryName } from '@/lib/format';
import { pluralise } from '@/lib/utils';
import { getCreator, listCreators } from '@/server/data/queries';
import { achievementSlug } from '@/domain/honours';
import { fillCreatorSlots, isPlaceholderUrl } from '@/domain/creator-slots';
import type { HonourEntry } from '@/server/data/types';

export const revalidate = 900;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const creators = await listCreators({ limit: 200 });
  return creators.map((creator) => ({ slug: creator.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const creator = await getCreator(slug);
  if (!creator) {
    return buildMetadata({
      title: 'Creator',
      description: '',
      path: `/creators/${slug}`,
      noIndex: true,
    });
  }

  const honours = creator.record.filter((entry) => entry.state === 'active');
  const wins = honours.filter((entry) => entry.kind === 'winner');

  return buildMetadata({
    title: creator.displayName,
    description:
      wins.length > 0
        ? `${creator.displayName} holds ${wins.length} PALMA ${pluralise(wins.length, 'award')}, ${wins.map((entry) => `${entry.categoryName} ${entry.year}`).join(', ')}. The permanent PALMA record.`
        : `${creator.displayName}, ${creator.headline ?? 'creator'} in the PALMA record.`,
    path: `/creators/${creator.slug}`,
    image: `/creators/${creator.slug}/opengraph-image`,
    type: 'profile',
  });
}

export default async function CreatorPage({ params }: Params) {
  const { slug } = await params;
  const creator = await getCreator(slug);
  if (!creator) notFound();

  const allActive = creator.record.filter((entry) => entry.state === 'active');
  // Taken out of the list before the list is drawn. A creator who holds THE
  // PALMA should not have it appear as the fourth row of a table, sorted
  // between two category finalists.
  const palmas = allActive.filter((entry) => entry.kind === 'the_palma');
  const active = allActive.filter((entry) => entry.kind !== 'the_palma');
  const wins = active.filter((entry) => entry.kind === 'winner');
  const profileUrl = absoluteUrl(`/creators/${creator.slug}`);
  const { slots, rest } = fillCreatorSlots(creator.links);

  // Repeat honours in one category across seasons collapse into a single
  // "N-time" row: two years of the same win are one fact about the record,
  // not two near-identical rows saying it. `active` arrives newest-first, so
  // every group leads with its most recent conferral. The seasons themselves,
  // with their codes, stay in the drawers below.
  const honourGroups: {
    kind: HonourEntry['kind'];
    categorySlug: string;
    categoryName: string;
    entries: HonourEntry[];
  }[] = [];
  for (const entry of active) {
    const group = honourGroups.find(
      (candidate) => candidate.kind === entry.kind && candidate.categorySlug === entry.categorySlug,
    );
    if (group) group.entries.push(entry);
    else
      honourGroups.push({
        kind: entry.kind,
        categorySlug: entry.categorySlug,
        categoryName: entry.categoryName,
        entries: [entry],
      });
  }

  // The per-season record the collapsed rows summarise. Drawers, closed by
  // default, so a long career does not stretch the page.
  const honourYears = [...new Set(active.map((entry) => entry.year))].sort((a, b) => b - a);

  // The sidebar names the wins the same way the record does.
  const winLines = honourGroups
    .filter((group) => group.kind === 'winner')
    .map((group) =>
      group.entries.length > 1
        ? `${group.entries.length}-time ${group.categoryName}`
        : `${group.categoryName}, ${group.entries[0]!.year}`,
    );

  return (
    <>
      <Section tone="ivory" className="pt-12 pb-0! sm:pt-16">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <Reveal variant="enter" className="lg:col-span-5">
              <EditorialImage
                name={creator.displayName}
                src={creator.portraitUrl}
                alt={creator.portraitAlt}
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </Reveal>

            <Reveal
              variant="enter"
              delay={0.1}
              className="flex flex-col gap-8 lg:col-span-7 lg:pt-6"
            >
              <div className="flex flex-col gap-5">
                <h1 className="text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
                  {creator.displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="palma-label text-taupe-deep">
                    Creator · {countryName(creator.countryCode)}
                    {creator.city ? ` · ${creator.city}` : ''}
                  </span>
                  {creator.pronouns ? (
                    <span className="palma-label text-taupe">{creator.pronouns}</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <VerificationBadge status={creator.verificationStatus} />
                  {wins.length > 0 ? (
                    <Badge variant="champagne">
                      {wins.length} PALMA {pluralise(wins.length, 'win')}
                    </Badge>
                  ) : null}
                </div>
              </div>

              {creator.headline ? (
                <p className="font-display text-ink/85 max-w-140 text-2xl leading-snug">
                  {creator.headline}
                </p>
              ) : null}

              {creator.biography ? (
                <p className="text-taupe-deep max-w-140 leading-relaxed">{creator.biography}</p>
              ) : null}

              {/* The Channel slot first, always, filled or not, then anything
                  else the creator added. A seeded placeholder address stays in
                  the family: it links to PALMA's own holding page rather than
                  sending a reader to example.com. */}
              <ul className="flex flex-wrap gap-x-4 gap-y-3">
                {slots.map(({ slot, link }) => (
                  <li key={slot.key} className="flex items-center gap-1">
                    {link ? (
                      isPlaceholderUrl(link.url) ? (
                        <Link
                          href={`/creators/${creator.slug}/channel`}
                          className="palma-label border-stone-deep text-taupe-deep hover:border-ink hover:text-ink inline-flex items-center gap-2 border-b pb-1 transition-colors"
                        >
                          {slot.label}
                        </Link>
                      ) : (
                        <>
                          <a
                            href={link.url}
                            rel="nofollow noopener noreferrer"
                            target="_blank"
                            className="palma-label border-stone-deep text-taupe-deep hover:border-ink hover:text-ink inline-flex items-center gap-2 border-b pb-1 transition-colors"
                          >
                            {slot.label}
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                          </a>
                          <CopyMark value={link.url} label={`Copy the ${slot.label} link`} />
                        </>
                      )
                    ) : (
                      <span
                        className="palma-label text-taupe border-stone-deep/60 inline-flex items-center gap-2 border-b border-dashed pb-1"
                        title={slot.empty}
                      >
                        {slot.label}
                        <span className="text-taupe/70 normal-case">{slot.empty}</span>
                      </span>
                    )}
                  </li>
                ))}

                {rest.map((link) => (
                  <li key={link.url} className="flex items-center gap-1">
                    <a
                      href={link.url}
                      rel="nofollow noopener noreferrer"
                      target="_blank"
                      className="palma-label border-stone-deep text-taupe-deep hover:border-ink hover:text-ink inline-flex items-center gap-2 border-b pb-1 transition-colors"
                    >
                      {link.label}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                    <CopyMark value={link.url} label={`Copy the ${link.label} link`} />
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section className="pt-16 sm:pt-20">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Reveal
                variant="enter"
                className="border-ink/20 flex items-end justify-between gap-6 border-b pb-5"
              >
                <h2 className="text-3xl sm:text-4xl">PALMA record</h2>
                <span className="palma-label text-taupe-deep">
                  {allActive.length} {pluralise(allActive.length, 'honour')}
                </span>
              </Reveal>

              {/* One address for the person. It leads with whatever they won
                  most recently and keeps working as they win more, which is why
                  it is the one PALMA tells a creator to use. */}
              {active.length > 0 || palmas.length > 0 ? (
                <div className="border-stone-deep mt-8 flex flex-wrap items-center gap-4 border-t pt-6">
                  <span className="palma-label text-taupe-deep">Their PALMA link</span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Link
                      href={`/c/${creator.slug}`}
                      className="palma-link font-mono text-sm break-all"
                    >
                      palmaawards.com/c/{creator.slug}
                    </Link>
                    <CopyMark
                      value={absoluteUrl(`/c/${creator.slug}`)}
                      label={`Copy ${creator.displayName}'s PALMA link`}
                    />
                  </span>
                </div>
              ) : null}

              {palmas.map((entry) => (
                <div key={entry.id} className="on-ink bg-ink text-ivory relative isolate mt-8">
                  <div
                    aria-hidden="true"
                    className="border-champagne/30 pointer-events-none absolute inset-2 border"
                  />
                  <div className="relative flex flex-col gap-4 p-7 sm:p-9">
                    <span className="palma-label text-champagne text-[0.75rem] tracking-[0.28em]">
                      THE PALMA
                    </span>
                    <span className="font-display text-[clamp(2rem,7vw,3.25rem)] leading-[0.95] tabular-nums">
                      {entry.year}
                    </span>
                    {entry.citation ? (
                      <p className="font-display text-ivory/70 max-w-140 leading-relaxed text-balance">
                        {entry.citation}
                      </p>
                    ) : null}
                    <div className="border-champagne/20 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4">
                      <span className="text-ivory/40 text-xs tracking-[0.18em] uppercase">
                        One recipient a year
                      </span>
                      {entry.code ? (
                        <Link
                          href={`/verify/${entry.code}`}
                          className="text-champagne/90 hover:text-champagne font-mono text-xs tracking-wider"
                        >
                          {entry.code}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}

              {active.length === 0 ? (
                <EmptyState
                  className="mt-10"
                  title="No honours yet"
                  description="This creator holds no PALMA honours at present. Nominations for the current season may be open."
                  action={
                    <Button asChild size="sm" variant="outline">
                      <Link href="/nominate">Nominate this creator</Link>
                    </Button>
                  }
                />
              ) : (
                <>
                  {/* The summary: one row per honour held, with repeats in a
                      category collapsed. The drawers below carry the seasons,
                      the individual honours and their codes. */}
                  <RevealGroup as="ul" className="mt-2">
                    {honourGroups.map((group) => (
                      <RevealItem
                        as="li"
                        key={`${group.kind}-${group.categorySlug}`}
                        className="border-stone-deep border-b py-7"
                      >
                        <AchievementBadge
                          kind={group.kind}
                          year={group.entries[0]!.year}
                          categoryName={group.categoryName}
                          times={group.entries.length}
                          revoked={group.entries[0]!.state === 'revoked'}
                        />
                      </RevealItem>
                    ))}
                  </RevealGroup>

                  <div className="mt-10">
                    <span className="palma-label text-taupe-deep">By season</span>
                    <div className="border-stone-deep mt-4 flex flex-col border-t">
                      {honourYears.map((year, index) => {
                        const entries = active.filter((entry) => entry.year === year);
                        return (
                          <details
                            key={year}
                            open={index === 0}
                            className="group border-stone-deep border-b"
                          >
                            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
                              <span className="font-display text-xl leading-none">
                                PALMA {year}
                              </span>
                              <span className="flex shrink-0 items-center gap-3">
                                <span className="palma-label text-taupe-deep">
                                  {entries.length} {pluralise(entries.length, 'honour')}
                                </span>
                                <Plus
                                  className="text-taupe-deep size-4 transition-transform group-open:rotate-45"
                                  aria-hidden="true"
                                />
                              </span>
                            </summary>
                            <ul className="divide-stone-deep/60 flex flex-col divide-y">
                              {entries.map((entry) => (
                                <li
                                  key={entry.id}
                                  className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <AchievementBadge
                                    kind={entry.kind}
                                    year={entry.year}
                                    categoryName={entry.categoryName}
                                    revoked={entry.state === 'revoked'}
                                  />
                                  <div className="flex shrink-0 items-center gap-3 pl-7.5 sm:pl-0">
                                    {/* This honour on its own, for citing one
                                        specifically. The link a creator hands
                                        out is /c/{slug}, one address for the
                                        person rather than one per honour, and
                                        it sits above the list. */}
                                    <Link
                                      href={`/creators/${creator.slug}/${achievementSlug(
                                        entry.kind,
                                        entry.categorySlug,
                                        entry.year,
                                      )}`}
                                      className="palma-label text-taupe-deep hover:text-ink transition-colors"
                                    >
                                      This honour
                                    </Link>
                                    <Link
                                      href={`/categories/${entry.categorySlug}?year=${entry.year}`}
                                      className="palma-label text-taupe-deep hover:text-ink transition-colors"
                                    >
                                      Category
                                    </Link>
                                    {entry.code ? (
                                      <Link
                                        href={`/verify/${entry.code}`}
                                        className="palma-label text-olive hover:text-ink transition-colors"
                                      >
                                        Verify
                                      </Link>
                                    ) : null}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <p className="text-taupe-deep mt-8 text-sm leading-relaxed">
                Every honour above is backed by a permanent verification record issued at the time
                it was conferred. PALMA does not publish judging scores, and never will.
              </p>
            </div>

            <Reveal as="div" delay={0.08} className="flex flex-col gap-8 lg:col-span-4">
              {wins.length > 0 ? (
                <div className="border-stone-deep bg-ivory-bright flex flex-col items-center gap-6 border p-8 text-center">
                  <PalmaSeal
                    legend={`PALMA ${wins[0]!.year}`}
                    sublegend="THE CREATOR HONOURS"
                    centre="Winner"
                    className="text-olive h-40 w-40"
                  />
                  {/* The seal counts wins. Calling them "honours" here while the
                      record beside it counts finalist places too made the same
                      page say two different numbers for one word. */}
                  <p className="font-display text-xl leading-snug">
                    {wins.length} PALMA {pluralise(wins.length, 'win')}
                  </p>
                  <p className="text-taupe-deep text-sm leading-relaxed">{winLines.join(' · ')}</p>
                </div>
              ) : null}

              <div className="border-stone-deep flex flex-col gap-4 border p-7">
                <h2 className="palma-label text-taupe-deep">Share this record</h2>
                <p className="text-taupe-deep text-sm leading-relaxed">
                  The PALMA record is public and permanent. Copy the link to cite it in a press kit,
                  a profile or a pitch.
                </p>
                <div className="flex flex-wrap gap-2">
                  <CopyLink value={profileUrl} label="Copy profile link" />
                  {active[0]?.code ? (
                    <CopyLink
                      value={absoluteUrl(`/verify/${active[0].code}`)}
                      label="Copy verification link"
                    />
                  ) : null}
                </div>
              </div>

              {/* A record exists before its creator has an account. This is the
                  only route by which the two are ever joined, and it opens a
                  request, not a door. */}
              {creator.isClaimed ? (
                <div className="border-stone-deep flex flex-col gap-3 border p-7">
                  <h2 className="palma-label text-olive">Claimed record</h2>
                  <p className="text-taupe-deep text-sm leading-relaxed">
                    This creator holds their PALMA record and maintains how they are described here.
                    The honours, and the record of how they were reached, remain PALMA&rsquo;s.
                  </p>
                </div>
              ) : (
                <div className="border-stone-deep flex flex-col gap-3 border p-7">
                  <h2 className="palma-label text-taupe-deep">Is this you?</h2>
                  <p className="text-taupe-deep text-sm leading-relaxed">
                    PALMA wrote this record when {creator.displayName} was first nominated. Claim it
                    to manage how you are described, PALMA reviews every claim by hand before the
                    record is treated as yours.
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-1 self-start">
                    <Link href={`/creator/claim?creator=${creator.slug}`}>Claim this profile</Link>
                  </Button>

                  {/* The other half of the same sentence. A record PALMA wrote
                      about somebody who never asked rests on legitimate
                      interests, and the person named may object, so the
                      objection is offered as plainly as the claim, rather than
                      buried in a privacy notice they would have to go and
                      find. */}
                  <div className="border-stone-deep/60 mt-4 border-t pt-4">
                    <p className="text-taupe text-xs leading-relaxed">
                      It is you, and you would rather not be here? PALMA wrote this record without
                      asking, and you can have it taken down,{' '}
                      <Link
                        href={`/creators/${creator.slug}/object`}
                        className="palma-link text-taupe-deep"
                      >
                        ask PALMA to remove it
                      </Link>
                      . No account, no reason needed.
                    </p>
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </Container>
      </Section>

      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Creators', path: '/creators' },
            { name: creator.displayName, path: `/creators/${creator.slug}` },
          ]),
          ...wins.map((entry) =>
            awardJsonLd({
              creatorName: creator.displayName,
              creatorUrl: profileUrl,
              categoryName: entry.categoryName,
              year: entry.year,
              kind: 'Winner',
              code: entry.code,
            }),
          ),
        ]}
      />
    </>
  );
}
