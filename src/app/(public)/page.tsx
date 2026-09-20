import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Container, Section, SectionHeading } from '@/components/palma/layout';
import { Reveal } from '@/components/palma/Reveal';
import { CreatorCard } from '@/components/palma/CreatorCard';
import { SeasonChoreography } from '@/components/motion/SeasonChoreography';
import { PalmMark } from '@/components/brand/PalmMark';
import { HONOUR_LABEL } from '@/components/palma/badges';
import { formatDate } from '@/lib/format';
import { acceptsNominations, STAGE_LABEL } from '@/domain/season';
import {
  getCurrentSeason,
  getRollOfHonour,
  listArticles,
  listCategories,
  listCreators,
  listRecentHonours,
} from '@/server/data/queries';
import { ordinal } from '@/lib/utils';

export const revalidate = 900;

export default async function HomePage() {
  const season = await getCurrentSeason();
  const [creators, honours, roll, articles, categories] = await Promise.all([
    listCreators({ honoursOnly: true, limit: 3 }),
    listRecentHonours(6),
    getRollOfHonour(),
    listArticles({ limit: 3 }),
    listCategories(season.year),
  ]);

  const open = acceptsNominations(season.stage);
  const rollPreview = roll.flatMap((year) => year.entries).slice(0, 6);
  // The Roll of Honour holds winners, so this is a count of PALMAs conferred —
  // not of honours, which would also include finalist places.
  const palmasConferred = roll.reduce((sum, year) => sum + year.entries.length, 0);

  // Days until nominations close, counted here rather than written into copy,
  // so the hero cannot go stale while the season is running.
  const closesIn = season.nominationsCloseAt
    ? Math.max(
        0,
        Math.ceil((new Date(season.nominationsCloseAt).getTime() - Date.now()) / 86_400_000),
      )
    : null;
  const lead = articles[0];
  const rest = articles.slice(1);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="on-ink bg-ink text-ivory relative overflow-hidden">
        <PalmMark
          variant="line"
          className="text-ivory/[0.035] sm:text-ivory/[0.05] pointer-events-none absolute -top-6 -right-24 h-72 sm:-top-20 sm:-right-16 sm:h-160"
        />
        <Container className="relative flex min-h-[72dvh] flex-col justify-center py-20 sm:py-28">
          <Reveal variant="reveal" className="flex flex-col gap-10">
            <div className="flex flex-col gap-6">
              <span className="palma-label text-champagne">{season.title}</span>
              <h1 className="palma-wordmark text-[19vw] leading-[0.82] sm:text-[13rem] lg:text-[17rem]">
                PALMA
              </h1>
              <p className="palma-label border-ivory/20 text-ivory/70 border-t pt-6 sm:text-xs">
                The Creator Honours
              </p>
            </div>

            <p className="font-display text-ivory/85 max-w-150 text-2xl leading-[1.25] sm:text-4xl">
              Recognising the people shaping creator culture.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild variant="ivory" size="lg">
                <Link href={`/awards/${season.year}`}>Explore {season.title}</Link>
              </Button>
              <Button asChild variant="quiet" size="lg">
                <Link href="/nominate">Nominate a creator</Link>
              </Button>
            </div>

            {/* The state of the institution, counted live. The hero says what
                is true this minute rather than what was true when it was
                written. */}
            <dl className="border-ivory/12 mt-2 flex flex-wrap gap-x-12 gap-y-5 border-t pt-8 sm:gap-x-16">
              <div className="flex flex-col gap-1.5">
                <dt className="palma-label text-ivory/40">Nominations</dt>
                <dd className="font-display text-ivory text-2xl leading-none">
                  {open ? 'Open' : STAGE_LABEL[season.stage]}
                </dd>
              </div>

              {open && closesIn !== null ? (
                <div className="flex flex-col gap-1.5">
                  <dt className="palma-label text-ivory/40">Closing</dt>
                  <dd className="font-display text-ivory text-2xl leading-none">
                    {closesIn === 0 ? 'Today' : `${closesIn} days`}
                  </dd>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <dt className="palma-label text-ivory/40">Categories</dt>
                <dd className="font-display text-ivory text-2xl leading-none tabular-nums">
                  {categories.length}
                </dd>
              </div>

              <div className="flex flex-col gap-1.5">
                <dt className="palma-label text-ivory/40">PALMAs conferred</dt>
                <dd className="font-display text-ivory text-2xl leading-none tabular-nums">
                  {palmasConferred}
                </dd>
              </div>

              <div className="flex flex-col gap-1.5">
                <dt className="palma-label text-ivory/40">Cost to nominate</dt>
                <dd className="font-display text-ivory text-2xl leading-none">Free</dd>
              </div>
            </dl>
          </Reveal>
        </Container>
      </section>

      {/* ── Current season ───────────────────────────────────────────────── */}
      <Section tone="ink" className="border-ivory/12 border-t pt-0! pb-24 sm:pb-28">
        <Container>
          <div className="border-ivory/12 flex flex-col gap-12 border-t pt-16">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-4">
                <span className="palma-label text-ivory/45">Current season</span>
                <h2 className="text-4xl sm:text-5xl">{season.title}</h2>
                {season.tagline ? (
                  <p className="text-ivory/60 max-w-140">{season.tagline}</p>
                ) : null}
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <Badge variant={open ? 'champagneDark' : 'outlineIvory'}>
                  {open ? 'Nominations open' : STAGE_LABEL[season.stage]}
                </Badge>
                {season.nominationsCloseAt ? (
                  <span className="palma-label text-ivory/45">
                    Closes {formatDate(season.nominationsCloseAt)}
                  </span>
                ) : null}
              </div>
            </div>

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

            <div className="border-ivory/12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t pt-8">
              <span className="palma-label text-ivory/45">
                {categories.length} categories contested
              </span>
              <Link
                href="/categories"
                className="palma-label text-champagne inline-flex items-center gap-2 transition-opacity hover:opacity-75"
              >
                View the categories
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Featured creators ────────────────────────────────────────────── */}
      <Section>
        <Container>
          <SectionHeading
            label="Featured"
            title="Creators in the record"
            standfirst="Every name below is carried by an honour that can be verified, in a category, in a season, by a panel."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/creators">All creators</Link>
              </Button>
            }
          />

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((creator, index) => (
              <Reveal key={creator.slug} delay={index * 80}>
                <CreatorCard creator={creator} priority={index < 2} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── Latest honours ───────────────────────────────────────────────── */}
      <Section tone="stone" className="py-20 sm:py-24">
        <Container>
          <SectionHeading label="Latest honours" title="Recently entered into the record" />

          <ul className="mt-12 flex flex-col">
            {honours.map((honour) => (
              <li key={`${honour.year}-${honour.categorySlug}-${honour.creator.slug}`}>
                <Link
                  href={`/creators/${honour.creator.slug}`}
                  className="group border-stone-deep hover:bg-ivory/40 grid grid-cols-1 items-baseline gap-2 border-t py-6 transition-colors sm:grid-cols-12 sm:gap-6"
                >
                  <span className="palma-label text-taupe-deep sm:col-span-2">{honour.year}</span>
                  <span className="palma-row-lead font-display text-2xl leading-none sm:col-span-4">
                    {honour.creator.displayName}
                  </span>
                  <span className="text-taupe-deep text-sm sm:col-span-4">
                    {honour.categoryName}
                  </span>
                  <span className="palma-label text-champagne-deep sm:col-span-2 sm:text-right">
                    {HONOUR_LABEL[honour.kind]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ── PaROH preview ────────────────────────────────────────────────── */}
      <Section tone="olive" className="relative overflow-hidden">
        <Container>
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="flex flex-col gap-8 lg:col-span-5">
              <h2 className="text-5xl leading-[0.95] sm:text-6xl">
                PALMA
                <br />
                Roll of Honour
              </h2>
              <p className="text-ivory/70 max-w-100">
                The permanent record of PALMA recipients. Every honour, every season, kept so it can
                still be cited a decade from now.
              </p>
              <div className="flex flex-col gap-5">
                <div>
                  <Button asChild variant="ivory" size="md">
                    <Link href="/paroh" className="palma-label-brand">
                      Enter the PaROH
                    </Link>
                  </Button>
                </div>
                {/* The one hand-written line on the homepage. */}
                <p className="palma-annotation text-ivory">and one day, your name</p>
              </div>
            </div>

            <ul className="flex flex-col lg:col-span-7">
              {rollPreview.map((entry, index) => (
                <li key={`${entry.year}-${entry.categorySlug}`}>
                  <Link
                    href={`/creators/${entry.creator.slug}`}
                    className="palma-row group/card border-ivory/20 flex items-baseline justify-between gap-6 border-t py-5"
                  >
                    <span className="flex items-baseline gap-5">
                      <span className="palma-label text-ivory/40">{ordinal(index)}</span>
                      <span className="flex flex-col gap-1">
                        <span className="palma-row-lead font-display text-xl leading-none">
                          {entry.creator.displayName}
                        </span>
                        <span className="palma-label text-ivory/45">{entry.categoryName}</span>
                      </span>
                    </span>
                    <span className="palma-label text-champagne shrink-0">{entry.year}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      {/* ── Journal ──────────────────────────────────────────────────────── */}
      <Section>
        <Container>
          <SectionHeading
            label="The PALMA Journal"
            title="Writing on the industry PALMA recognises"
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/journal">Read the Journal</Link>
              </Button>
            }
          />

          {lead ? (
            <div className="mt-14 grid gap-12 lg:grid-cols-12">
              <Reveal className="lg:col-span-7">
                <Link href={`/journal/${lead.slug}`} className="group flex flex-col gap-5">
                  <span className="palma-label text-taupe-deep">
                    {lead.category ?? 'Journal'} · {formatDate(lead.publishedAt)}
                  </span>
                  <h3 className="group-hover:text-olive text-3xl leading-tight transition-colors sm:text-5xl">
                    {lead.title}
                  </h3>
                  <p className="text-taupe-deep max-w-140 text-[1.0625rem] leading-relaxed">
                    {lead.standfirst}
                  </p>
                  <span className="palma-label text-olive inline-flex items-center gap-2">
                    Read
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </Reveal>

              <ul className="flex flex-col lg:col-span-5">
                {rest.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`/journal/${article.slug}`}
                      className="group border-stone-deep flex flex-col gap-2.5 border-t py-6"
                    >
                      <span className="palma-label text-taupe-deep">
                        {article.category ?? 'Journal'}
                      </span>
                      <h3 className="font-display group-hover:text-olive text-xl leading-snug transition-colors">
                        {article.title}
                      </h3>
                      <span className="text-taupe-deep text-sm">
                        {article.readingMinutes} min read
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Container>
      </Section>

      {/* ── Closing ──────────────────────────────────────────────────────── */}
      <Section tone="ink" className="py-24 sm:py-32">
        <Container className="flex flex-col items-center gap-10 text-center">
          <PalmMark className="text-champagne/70 h-14" />
          <h2 className="max-w-180 text-4xl leading-[1.05] sm:text-6xl">
            PALMA is not the event.
            <br />
            PALMA is the record.
          </h2>
          <p className="text-ivory/60 max-w-120">
            Nominations for {season.title} are {open ? 'open' : 'closed'}. A nomination costs
            nothing, and cannot be bought.
          </p>
          <Button asChild variant="ivory" size="lg">
            <Link href="/nominate">Nominate a creator</Link>
          </Button>
        </Container>
      </Section>
    </>
  );
}
