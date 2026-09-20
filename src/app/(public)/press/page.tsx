import Link from 'next/link';
import { Container, Section, SectionHeading } from '@/components/palma/layout';
import { Masthead, MastheadPlate, PlateFact } from '@/components/palma/Masthead';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/primitives';
import { Wordmark } from '@/components/brand/Wordmark';
import { PalmMark } from '@/components/brand/PalmMark';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { formatDate } from '@/lib/format';
import { CONTACTS, ENTITY } from '@/lib/legal';
import { MAX_TOTAL, SCORING_CRITERIA, formatPoints } from '@/domain/judging';
import { MIN_JUDGES_PER_CANDIDACY } from '@/domain/selection';
import { listJudges, listSeasons, listCategoryIndex, getRollOfHonour } from '@/server/data/queries';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'Press',
  description:
    'Press kit for PALMA, The Creator Honours. Boilerplate, the facts of a season, the correct wording for an honour, and who to ask.',
  path: '/press',
});

export default async function PressPage() {
  const [seasons, categories, judges, roll] = await Promise.all([
    listSeasons(),
    listCategoryIndex(),
    listJudges(),
    getRollOfHonour(),
  ]);

  const current = seasons.find((season) => season.isCurrent) ?? seasons[0];
  const honours = roll.reduce((sum, group) => sum + group.entries.length, 0);

  return (
    <>
      <Masthead
        eyebrow="The institution"
        title="Press"
        standfirst="Everything a newsroom needs to write about PALMA accurately, including the exact wording of an honour and a way to check any claim about one."
        meta={[
          current ? `Current season, PALMA ${current.year}` : 'Between seasons',
          `${categories.length} categories`,
          `${honours} honours on the record`,
        ]}
        plate={
          <MastheadPlate label="The facts">
            <dl className="grid grid-cols-2 gap-5">
              <PlateFact term="Seasons">{seasons.length}</PlateFact>
              <PlateFact term="Categories">{categories.length}</PlateFact>
              <PlateFact term="Panel">{judges.length} judges</PlateFact>
              <PlateFact term="Honours">{honours}</PlateFact>
            </dl>
          </MastheadPlate>
        }
        actions={
          <Button asChild>
            <a href={`mailto:${CONTACTS.press}`}>Press enquiries</a>
          </Button>
        }
      />

      <Section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
                Boilerplate. Copy this
              </h2>
              <blockquote className="border-olive/40 mt-6 border-l-2 pl-6">
                <p className="font-display text-xl leading-snug">
                  PALMA, The Creator Honours is a United Kingdom awards institution and permanent
                  public record of achievement in the creator industry. Nominations are free and
                  open to the public; honours are conferred by an independent panel judging against
                  published criteria, in which audience size is explicitly not a criterion. Every
                  honour is entered into the PALMA Roll of Honour with a verification record that
                  anyone can check.
                </p>
              </blockquote>

              <p className="text-taupe mt-6 text-sm leading-relaxed">
                {ENTITY.name}, trading as {ENTITY.tradingAs}, {ENTITY.jurisdiction}. The brand is
                always <strong className="text-ink">PALMA</strong>. Set in capitals, never
                &ldquo;Palma Awards&rdquo; in body copy. The archive is the{' '}
                <strong className="text-ink">PALMA Roll of Honour</strong>, abbreviated{' '}
                <strong className="text-ink">PaROH</strong>, with that exact casing. It is never
                called a hall of fame.
              </p>
            </div>

            <aside className="lg:col-span-5">
              <Reveal>
                <div className="border-stone-deep flex flex-col gap-6 border p-8">
                  <h2 className="palma-label text-taupe-deep">The marks</h2>
                  <div className="border-stone-deep/60 flex items-center justify-center border-b border-dashed py-8">
                    <Wordmark size="lg" descriptor />
                  </div>
                  <div className="flex items-center justify-center py-6">
                    <PalmMark className="text-ink h-20" />
                  </div>
                  <p className="text-taupe text-xs leading-relaxed">
                    Journalists may use the PALMA name, wordmark and palm mark to report on the
                    honours without permission or licence. Please do not recolour, stretch, rotate
                    or outline them.
                  </p>

                  {/* Linked rather than requested. A press page that tells a
                      journalist on deadline to send an email and wait is a
                      press page that gets the wrong logo used. */}
                  <div className="border-stone-deep/60 flex flex-wrap gap-x-5 gap-y-2 border-t pt-5">
                    <span className="palma-label text-taupe-deep">Download</span>
                    {[
                      ['/brand/palma-mark-on-ink.svg', 'SVG, on ink'],
                      ['/brand/palma-mark-on-ivory.svg', 'SVG, on ivory'],
                      ['/brand/palma-mark-on-ink.png', 'PNG, on ink'],
                      ['/brand/palma-mark-on-ivory.png', 'PNG, on ivory'],
                      ['/brand/palma-mark-transparent.png', 'PNG, transparent'],
                    ].map(([href, label]) => (
                      <a key={href} href={href} download className="palma-link text-ink text-xs">
                        {label}
                      </a>
                    ))}
                  </div>

                  <p className="text-taupe text-xs leading-relaxed">
                    For approved ceremony photography, write to{' '}
                    <a href={`mailto:${CONTACTS.press}`} className="palma-link text-ink">
                      {CONTACTS.press}
                    </a>
                    .
                  </p>
                </div>
              </Reveal>
            </aside>
          </div>
        </Container>
      </Section>

      <Section tone="stone" className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            label="Getting it right"
            title="How to describe an honour"
            standfirst="An honour is a fact about specific work, in a stated category, in a stated season. Stating it in full is always correct."
          />

          <div className="mt-12 grid gap-px sm:grid-cols-2">
            <div className="border-stone-deep bg-ivory border p-8">
              <h3 className="palma-label text-olive mb-5">Accurate</h3>
              <ul className="text-ink flex flex-col gap-3 text-sm leading-relaxed">
                <li>&ldquo;PALMA 2027 Winner, Best Independent Creator&rdquo;</li>
                <li>&ldquo;a finalist at the 2027 PALMA Creator Honours&rdquo;</li>
                <li>&ldquo;honoured by PALMA in 2027&rdquo;</li>
                <li>&ldquo;named in the PALMA Roll of Honour&rdquo;</li>
              </ul>
            </div>
            <div className="border-stone-deep bg-ivory border p-8">
              <h3 className="palma-label text-taupe-deep mb-5">Inaccurate</h3>
              <ul className="text-taupe-deep flex flex-col gap-3 text-sm leading-relaxed">
                <li>&ldquo;PALMA winner&rdquo; with no category or year</li>
                <li>&ldquo;PALMA-endorsed&rdquo; or &ldquo;official PALMA creator&rdquo;</li>
                <li>
                  &ldquo;voted for by the public&rdquo;, the public nominates, the panel judges
                </li>
                <li>&ldquo;PALMA Hall of Fame&rdquo;. It is the Roll of Honour</li>
                <li>Any nomination figure. PALMA does not publish them.</li>
              </ul>
            </div>
          </div>

          <p className="text-taupe-deep mt-10 max-w-180 text-sm leading-relaxed">
            Every honour carries a verification code. Entering it at{' '}
            <Link href="/verify" className="palma-link text-ink">
              /verify
            </Link>{' '}
            returns the honour, the season, the category and its current state, including whether it
            has been revoked, no account, no request to PALMA. Please check a claim rather than
            asking us to confirm one. The full rules are in{' '}
            <Link href="/legal/mark" className="palma-link text-ink">
              use of the PALMA mark
            </Link>
            .
          </p>
        </Container>
      </Section>

      <Section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
                Facts you can print
              </h2>
              <dl className="mt-6 flex flex-col">
                {[
                  ['Founded', ENTITY.jurisdiction],
                  ['Categories this season', String(categories.length)],
                  ['Judges on the panel', String(judges.length)],
                  ['Judges per candidacy', `${MIN_JUDGES_PER_CANDIDACY} minimum`],
                  [
                    'Judging criteria',
                    `${SCORING_CRITERIA.length}, weighted, marked out of ${formatPoints(MAX_TOTAL)}`,
                  ],
                  ['Audience size as a criterion', 'Not used'],
                  ['Cost to nominate', 'Free'],
                  ['Cost to be shortlisted or to win', 'Free, and unpurchasable'],
                  ['Honours on the record', String(honours)],
                  [
                    'Ceremony',
                    current?.ceremonyAt ? formatDate(current.ceremonyAt) : 'To be announced',
                  ],
                ].map(([term, value]) => (
                  <div
                    key={term}
                    className="palma-row border-stone-deep/60 flex items-baseline justify-between gap-6 border-b py-3.5 last:border-none"
                  >
                    <dt className="text-taupe-deep text-sm">{term}</dt>
                    <dd className="palma-row-lead text-right text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="lg:col-span-6">
              <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
                Where to look
              </h2>
              <RevealGroup className="mt-6 flex flex-col">
                {[
                  {
                    href: '/paroh',
                    label: 'PALMA Roll of Honour',
                    note: 'The permanent archive, by season and category.',
                  },
                  {
                    href: '/about/judging',
                    label: 'How judging works',
                    note: `The ${SCORING_CRITERIA.length} criteria and how scores are aggregated.`,
                  },
                  {
                    href: '/about/judges',
                    label: 'The panel',
                    note: 'Who judges, and what they are told to ignore.',
                  },
                  {
                    href: '/about/sponsors',
                    label: 'Partners',
                    note: 'Who funds PALMA, and what sponsorship cannot buy.',
                  },
                  {
                    href: '/legal/rules',
                    label: 'Competition rules',
                    note: 'Eligibility, screening, selection, disqualification.',
                  },
                  {
                    href: '/journal',
                    label: 'The Journal',
                    note: 'PALMA’s own writing, including season announcements.',
                  },
                ].map((item) => (
                  <RevealItem key={item.href}>
                    <Link
                      href={item.href}
                      className="palma-row group/card border-stone-deep/60 flex items-baseline justify-between gap-6 border-b py-4 last:border-none"
                    >
                      <span className="flex flex-col gap-1">
                        <span className="palma-row-lead font-display text-lg">{item.label}</span>
                        <span className="text-taupe text-xs leading-relaxed">{item.note}</span>
                      </span>
                      <span aria-hidden="true" className="text-taupe shrink-0 text-sm">
                        →
                      </span>
                    </Link>
                  </RevealItem>
                ))}
              </RevealGroup>

              <div className="border-stone-deep mt-10 border p-7">
                <h3 className="palma-label text-taupe-deep mb-3">Enquiries</h3>
                <p className="text-taupe-deep text-sm leading-relaxed">
                  Write to{' '}
                  <a href={`mailto:${CONTACTS.press}`} className="palma-link text-ink">
                    {CONTACTS.press}
                  </a>
                  . PALMA answers within two working days during a season. It does not brief results
                  in advance, on or off the record, to anyone, including partners, and a request for
                  an embargoed winner list will be declined.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
