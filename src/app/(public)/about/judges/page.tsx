import Link from 'next/link';
import { Container, Section, SectionHeading } from '@/components/palma/layout';
import { Masthead, MastheadPlate, PlateFact } from '@/components/palma/Masthead';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/primitives';
import { EmptyState } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { CONTACTS } from '@/lib/legal';
import { MIN_JUDGES_PER_CANDIDACY } from '@/domain/selection';
import { listJudges, listSeasons } from '@/server/data/queries';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'The panel',
  description:
    'Who judges a PALMA, how they are appointed, what they are told to ignore, and what is never published about what they did.',
  path: '/about/judges',
});

export default async function JudgesPage() {
  const [judges, seasons] = await Promise.all([listJudges(), listSeasons()]);

  const current = seasons.find((season) => season.isCurrent) ?? seasons[0];
  const chair = judges.find((judge) => judge.isChair);

  return (
    <>
      <Masthead
        eyebrow="The institution"
        title="The panel"
        standfirst="A panel nobody can name is not independent, it is merely anonymous. Here is who judges a PALMA, and what they are told before they start."
        meta={[
          `${judges.length} judges seated`,
          `${MIN_JUDGES_PER_CANDIDACY} judges minimum per candidacy`,
          'Scores never published',
        ]}
        plate={
          <MastheadPlate label="The panel, counted">
            <dl className="grid grid-cols-2 gap-5">
              <PlateFact term="Seated">{judges.length}</PlateFact>
              <PlateFact term="Per candidacy">{MIN_JUDGES_PER_CANDIDACY} minimum</PlateFact>
              <PlateFact term="Season">{current ? current.year : '—'}</PlateFact>
              <PlateFact term="Chair votes">Never</PlateFact>
            </dl>
          </MastheadPlate>
        }
      />

      <Section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="palma-prose lg:col-span-7">
              <p>
                PALMA publishes its panel because independence that cannot be checked is just a
                claim. What it never publishes is what any individual judge did: no scores, no
                assignments, no remarks, no conflict declarations. Who sat is public. How they voted
                is confidential, permanently, and no complaint, sponsorship or press enquiry changes
                that.
              </p>
              <p>
                Judges are appointed for a season at a time by PALMA, on the basis of what they have
                actually done in the industry rather than how large an audience they have. They are
                paid a flat honorarium that does not vary with how they score, and they never learn
                which nominations came from whom.
              </p>
            </div>

            <aside className="lg:col-span-5">
              <Reveal>
                <div className="border-stone-deep border p-7">
                  <h2 className="palma-label text-taupe-deep mb-4">What judges are told</h2>
                  <ul className="text-taupe-deep flex flex-col gap-3 text-sm leading-relaxed">
                    <li>Discount audience size. It is not a criterion and never will be.</li>
                    <li>Discount nomination volume. You are not shown it.</li>
                    <li>Score independently, before seeing any other judge&rsquo;s score.</li>
                    <li>Declare a conflict the moment you recognise one.</li>
                    <li>Write a rationale a stranger could follow.</li>
                    <li>A submitted score is final. There is no quiet edit.</li>
                  </ul>
                </div>
              </Reveal>
            </aside>
          </div>
        </Container>
      </Section>

      <Section tone="stone" className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            label={current ? `Seated for ${current.year}` : 'The panel'}
            title="Who judges"
            standfirst={
              chair
                ? `${chair.displayName} chairs the panel. The chair sees the spread of scores before any list is confirmed, and scores nothing.`
                : undefined
            }
          />

          {judges.length === 0 ? (
            <EmptyState
              className="mt-12"
              title="The panel has not been announced"
              description="Judges for the coming season are appointed before nominations open, and are published here the day they are."
            />
          ) : (
            <RevealGroup className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
              {judges.map((judge) => (
                <RevealItem key={judge.id}>
                  {/* The name and the seasons served, and nothing else.
                      Naming the panel is what makes it accountable; a
                      biography, an employer and a home town are facts about a
                      person rather than about the panel, and they belong on
                      the judge's own record, not published beside a verdict
                      they are about to reach. */}
                  <article className="palma-chip border-stone-deep bg-ivory flex h-full flex-col gap-4 border p-7">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-display text-2xl leading-tight">{judge.displayName}</h3>
                      {judge.isChair ? (
                        <span className="palma-label text-champagne-deep shrink-0 pt-1">Chair</span>
                      ) : null}
                    </div>

                    <dl className="border-stone-deep/60 mt-auto flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-xs">
                      <div className="flex gap-2">
                        <dt className="text-taupe">Seasons</dt>
                        <dd className="text-ink">
                          {judge.seasons.length > 0
                            ? judge.seasons.map((season) => season.year).join(', ')
                            : 'Not yet seated'}
                        </dd>
                      </div>
                    </dl>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </Container>
      </Section>

      <Section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <h2 className="text-3xl leading-tight sm:text-4xl">How a judge is kept honest</h2>
              <span aria-hidden="true" className="bg-stone-deep mt-5 block h-px w-full max-w-md" />
            </div>

            <div className="lg:col-span-7">
              <ol className="flex flex-col">
                {[
                  {
                    title: 'Independence before aggregation',
                    body: 'Every judge scores alone. A judge cannot see another judge’s score, remark or ranking until their own is submitted and locked.',
                  },
                  {
                    title: 'Conflicts declared, not managed quietly',
                    body: 'A declared conflict removes the candidacy from that judge entirely. They cannot open it again. Reassignment is an administrator’s job, and the declaration is written to the audit log.',
                  },
                  {
                    title: 'Outliers trimmed, not overruled',
                    body: 'Where four or more judges have scored, the highest and lowest are dropped before ranking. Nobody is asked to change a score to fit.',
                  },
                  {
                    title: 'Scores are immutable',
                    body: 'A submitted assessment cannot be edited. A correction is a new, audited entry made by an administrator, with the state before and after it.',
                  },
                  {
                    title: 'Sponsors are structurally excluded',
                    body: 'There is no route through which a sponsor can reach a judge, see a score, or learn an outcome early. Not a policy, an absence of the mechanism.',
                  },
                ].map((item, index) => (
                  <li
                    key={item.title}
                    className="palma-row border-stone-deep flex gap-6 border-t py-6"
                  >
                    <span className="palma-label text-taupe shrink-0 pt-1.5">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex flex-col gap-2">
                      <h3 className="palma-row-lead font-display text-xl">{item.title}</h3>
                      <p className="text-taupe-deep text-sm leading-relaxed">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="text-taupe mt-10 text-sm leading-relaxed">
                The criteria themselves are published at{' '}
                <Link href="/about/judging" className="palma-link text-ink">
                  how judging works
                </Link>
                , and the full process is set out in the{' '}
                <Link href="/legal/rules" className="palma-link text-ink">
                  competition rules
                </Link>
                . To raise a concern about the conduct of a season, write to{' '}
                <a href={`mailto:${CONTACTS.integrity}`} className="palma-link text-ink">
                  {CONTACTS.integrity}
                </a>
                .
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
