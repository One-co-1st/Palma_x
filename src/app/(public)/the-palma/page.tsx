import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { Masthead, MastheadPlate } from '@/components/palma/Masthead';
import { Reveal, RevealGroup, RevealItem, DrawnRule } from '@/components/motion/primitives';
import { CeremonyCountdown } from '@/components/palma/CeremonyCountdown';
import { PalmaTrophy } from '@/components/three/PalmaTrophy';
import { PalmaYear } from '@/components/palma/PalmaYear';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { roman } from '@/lib/utils';
import { CONSIDERATIONS, NOT_MEASURED, THE_PALMA_CRITERION } from '@/domain/the-palma';
import {
  chapterOn,
  daysUntilCeremony,
  nextCeremony,
  OFF_SEASON_LENGTH_MONTHS,
  SEASON_LENGTH_MONTHS,
  type Month,
} from '@/domain/calendar';

// An hour. The only moving figure is a countdown measured in days, and the
// dial changes once a month.
export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'THE PALMA',
  description:
    'THE PALMA is the institution’s highest honour: one creator each year whose body of work has made the most significant contribution to adult creator culture. Not a lifetime achievement award.',
  path: '/the-palma',
});

export default function ThePalmaPage() {
  const now = new Date();
  const ceremony = nextCeremony(now);
  const chapter = chapterOn(now);
  const month = (now.getUTCMonth() + 1) as Month;

  return (
    <>
      <Masthead
        eyebrow="The highest honour"
        title="THE PALMA"
        titleLines={['THE PALMA']}
        standfirst="One creator. One year. The whole body of work."
        meta={['Conferred each July', 'One a year', 'Never shared']}
        figure={ceremony.year}
        plate={
          <MastheadPlate label="The next">
            <CeremonyCountdown
              target={ceremony.at.toISOString()}
              days={daysUntilCeremony(now)}
              year={ceremony.year}
            />
          </MastheadPlate>
        }
      />

      {/* ── The object ──────────────────────────────────────────────────
          THE PALMA is the only honour named after the institution, so the page
          about it shows the thing itself before it explains anything. The
          trophy carries its own gating: no WebGL, a reduced-motion preference
          or a scrolled-away section and the engraved seal stands in its place,
          which is the same mark rendered flat. */}
      <section className="on-ink bg-ink text-ivory border-ink relative overflow-hidden border-b">
        <span aria-hidden="true" className="palma-plate-glow" />

        <Container className="relative py-20 sm:py-28">
          <div className="mx-auto flex max-w-120 flex-col items-center gap-10 text-center">
            <Reveal variant="enter" className="w-full max-w-90 sm:max-w-100">
              <PalmaTrophy legend={`PALMA ${ceremony.year}`} centre="Laureate" />
            </Reveal>

            <Reveal delay={0.15} className="flex flex-col items-center gap-4">
              <span className="palma-label-brand text-champagne">THE PALMA</span>
              <p className="text-ivory/55 max-w-100 text-sm leading-relaxed text-balance">
                Struck once for each laureate and engraved with the season it was conferred in. The
                same mark appears on the verification page that proves it.
              </p>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ── What it is ──────────────────────────────────────────────────── */}
      <Section className="py-16 sm:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <Reveal>
                <p className="font-display text-2xl leading-snug sm:text-[2rem]">
                  {THE_PALMA_CRITERION}
                </p>
              </Reveal>

              <Reveal delay={0.1}>
                <DrawnRule className="mt-8 mb-8" />
              </Reveal>

              <div className="palma-prose">
                <Reveal delay={0.15}>
                  <p>
                    Every other honour PALMA confers is a judgement about a season, a piece of work,
                    a year, a category. THE PALMA is a judgement about a career. It is the only
                    honour the institution names after itself, and the only one conferred without a
                    category above it, because there is nothing above it.
                  </p>
                </Reveal>

                <Reveal delay={0.2}>
                  <p>
                    There is one a year. It is not shared, there is no runner-up, and no creator
                    receives it twice. An honour that can be given again is a ranking of the already
                    honoured; THE PALMA is meant to be terminal, the thing there is nothing after.
                  </p>
                </Reveal>
              </div>
            </div>

            {/* The clarification that decides what the honour actually is. It
                gets its own column rather than a sentence in the flow, because
                it is the single most likely thing to be got wrong. */}
            <aside className="lg:col-span-5">
              <Reveal delay={0.1}>
                <div className="border-champagne-deep bg-stone/40 border-l-2 p-7 sm:p-9">
                  <h2 className="palma-label text-taupe-deep">Not a lifetime achievement award</h2>

                  <p className="font-display mt-5 text-xl leading-snug sm:text-2xl">
                    A lifetime achievement award is a gold watch. It says the work is behind you.
                  </p>

                  <p className="text-taupe-deep mt-5 leading-relaxed">
                    THE PALMA is winnable, is meant to be won, by a creator in the middle of an
                    active career whose contribution has already become culturally significant.
                    Someone can receive it and go on to do their best work afterwards. That is not a
                    flaw in the honour; it is the point of it.
                  </p>
                </div>
              </Reveal>
            </aside>
          </div>
        </Container>
      </Section>

      {/* ── What the panel weighs ───────────────────────────────────────── */}
      <Section tone="stone" className="py-16 sm:py-24">
        <Container>
          <Reveal>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-4">
              What the panel weighs
            </h2>
          </Reveal>

          <Reveal delay={0.05}>
            <p className="text-taupe-deep mt-8 max-w-160 leading-relaxed">
              Eight considerations, published in advance, deliberately unweighted and deliberately
              unscored. There is no arithmetic that averages <em>influence on other creators</em>{' '}
              against <em>longevity</em>, and pretending otherwise would be the false precision this
              institution exists to avoid. The panel deliberates and names one creator. These are
              what the deliberation has to be about.
            </p>
          </Reveal>

          <div className="relative mt-14 pl-8 sm:pl-12">
            {/* Fills from the top as the eight are read, so the list reads as
                one argument being made rather than eight bullets. */}
            <span
              aria-hidden="true"
              className="palma-rail-fill absolute top-0 bottom-0 left-0 w-px sm:left-2"
            />

            <RevealGroup as="ol" className="flex flex-col gap-10 sm:gap-12">
              {CONSIDERATIONS.map((consideration, index) => (
                <RevealItem key={consideration.key} as="li" className="group/card">
                  <div className="flex items-baseline gap-4 sm:gap-6">
                    <span className="palma-numeral text-champagne-deep w-8 shrink-0 text-right text-sm">
                      {roman(index + 1)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-2xl leading-tight sm:text-3xl">
                        {consideration.title}
                      </h3>
                      <p className="text-taupe-deep mt-2.5 max-w-140 leading-relaxed">
                        {consideration.detail}
                      </p>
                    </div>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </Container>
      </Section>

      {/* ── What it is not ──────────────────────────────────────────────── */}
      <Section className="py-16 sm:py-24">
        <Container>
          <Reveal>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-4">
              What it is not measured on
            </h2>
          </Reveal>

          <RevealGroup as="ul" className="mt-12 flex flex-col gap-10" stagger={0.1}>
            {NOT_MEASURED.map((entry) => (
              <RevealItem
                key={entry.term}
                as="li"
                className="grid gap-3 sm:grid-cols-12 sm:items-baseline sm:gap-8"
              >
                <span className="sm:col-span-5">
                  <span className="font-display text-taupe-deep text-3xl leading-none sm:text-4xl">
                    Not{' '}
                    {/* Ruled out as it is read. The rule tracks the scroll
                        rather than firing on a timer, so it draws at the
                        reader's pace. */}
                    <span className="palma-strike text-ink">{entry.term.toLowerCase()}</span>.
                  </span>
                </span>
                <span className="text-taupe-deep leading-relaxed sm:col-span-7">{entry.why}</span>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal delay={0.1}>
            <p className="border-stone-deep text-taupe-deep mt-14 max-w-160 border-t pt-8 leading-relaxed">
              The difference between an award with authority and an award without one is whether its
              answer can be predicted from a public number. If THE PALMA could be worked out from a
              follower count, nobody would need a panel, and nobody would care who won.
            </p>
          </Reveal>
        </Container>
      </Section>

      {/* ── The year ────────────────────────────────────────────────────── */}
      <Section tone="stone" className="py-16 sm:py-24">
        <Container>
          <Reveal>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-4">
              The PALMA year
            </h2>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-16">
              <p className="font-display text-2xl leading-snug sm:text-3xl lg:col-span-7">
                Twelve months make one PALMA year. Four of them are the season; the other eight are
                the institution.
              </p>
              <p className="text-taupe-deep leading-relaxed lg:col-span-5">
                PALMA is not tied to January and December. The year <em>number</em> matters, it is
                what the record is filed under, for ever, but the event sits in the middle of the
                calendar, and THE PALMA is conferred in July. An institution that owns a season of
                the year owns an anticipation that rebuilds itself every twelve months.
              </p>
            </div>
          </Reveal>

          <div className="border-stone-deep mt-12 grid gap-8 border-y py-8 sm:grid-cols-3">
            <Fact term="Season" value={`${SEASON_LENGTH_MONTHS} months`} note="April to July" />
            <Fact
              term="Institution"
              value={`${OFF_SEASON_LENGTH_MONTHS} months`}
              note="Journal, archive, partnerships, next season"
            />
            <Fact term="Right now" value={chapter.label} note={chapter.months} />
          </div>

          <PalmaYear today={month} currentChapter={chapter.key} className="mt-16" />

          <Reveal>
            <p className="text-taupe-deep mt-14 max-w-160 leading-relaxed">
              Four months is closer to how an established cycle operates than six. Six months of a
              twelve-month year spent asking people to nominate is not an awards cycle, it is a
              permanent campaign, and a permanent campaign is how an award becomes background noise.
              PALMA has a season, then it breathes, then it comes back.
            </p>
          </Reveal>
        </Container>
      </Section>

      {/* ── Close ───────────────────────────────────────────────────────── */}
      <Section tone="ink" className="py-20 sm:py-28">
        <Container>
          <div className="flex flex-col items-center gap-8 text-center">
            <span className="palma-label text-taupe">Conferred each July</span>

            {/* The one element on the site that sets itself as it arrives. */}
            <p className="palma-wordmark palma-set-wide text-4xl sm:text-6xl">THE PALMA</p>

            <p className="text-stone max-w-140 leading-relaxed">
              Every honour PALMA confers enters the Roll of Honour with a signed verification record
              that can be checked for ever. THE PALMA is the last thing conferred on the night.
            </p>

            <div className="mt-2 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="ivory">
                <Link href="/paroh">The Roll of Honour</Link>
              </Button>
              <Button asChild size="lg" variant="quiet">
                <Link href="/about/judging">How judging works</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

function Fact({ term, value, note }: { term: string; value: string; note: string }) {
  return (
    <div className="palma-stat">
      <span className="palma-label text-taupe-deep block">{term}</span>
      <span className="font-display mt-2 block text-2xl leading-none">{value}</span>
      <span className="text-taupe mt-2 block text-sm">{note}</span>
    </div>
  );
}
