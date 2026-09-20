import Link from 'next/link';
import { Container, Section, SectionHeading } from '@/components/palma/layout';
import { Masthead, MastheadPlate, PlateFact } from '@/components/palma/Masthead';
import { Button } from '@/components/ui/button';
import { PalmMark } from '@/components/brand/PalmMark';
import { Stat } from '@/components/ui/stat';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/primitives';
import { buildMetadata } from '@/lib/seo';
import { getRollOfHonour, listCategoryIndex, listSeasons } from '@/server/data/queries';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'About',
  description:
    'PALMA is the permanent record of achievement in the creator industry. How the institution works, who judges, and what it refuses to be.',
  path: '/about',
});

export default async function AboutPage() {
  const [seasons, categories, roll] = await Promise.all([
    listSeasons(),
    listCategoryIndex(),
    getRollOfHonour(),
  ]);

  const honours = roll.reduce((sum, group) => sum + group.entries.length, 0);

  return (
    <>
      <Masthead
        eyebrow="The Creator Honours"
        title="PALMA is the record."
        titleLines={['PALMA is', 'the record.']}
        standfirst="The ceremony is one expression of it. What matters is that an honour conferred today can still be checked, cited and trusted in ten years."
        meta={['Founded in the United Kingdom', 'Independent panel', 'Permanent public archive']}
        plate={
          <MastheadPlate label="The institution, counted">
            <dl className="grid grid-cols-2 gap-5">
              <PlateFact term="Seasons">{seasons.length}</PlateFact>
              <PlateFact term="Categories">{categories.length}</PlateFact>
              <PlateFact term="PALMAs conferred">{honours}</PlateFact>
              <PlateFact term="Scores published">Never</PlateFact>
            </dl>
          </MastheadPlate>
        }
      />

      <Section>
        <Container>
          <RevealGroup className="border-stone-deep grid gap-8 border-b pb-14 sm:grid-cols-3">
            <RevealItem>
              <Stat label="Seasons" value={seasons.length} />
            </RevealItem>
            <RevealItem>
              <Stat label="Categories" value={categories.length} />
            </RevealItem>
            <RevealItem>
              <Stat label="PALMAs conferred" value={honours} />
            </RevealItem>
          </RevealGroup>

          <div className="mt-16 grid gap-16 lg:grid-cols-12">
            <Reveal className="palma-prose lg:col-span-7">
              <p>
                PALMA exists because the creator industry has been poorly served by recognition. The
                awards it has tended to be offered measure audience, which is a measure of
                distribution, not of work, and expire the moment the post scrolls past.
              </p>
              <p>
                PALMA is built the other way round. The archive came before the ceremony. Every
                honour is entered into the PALMA Roll of Honour, carries a permanent verification
                record, and is judged against published criteria by a panel that is told, in
                writing, to discount how many people are watching.
              </p>
              <p>
                We are deliberately narrow. PALMA is not a platform, a marketplace, a subscription
                service or a social network. It hosts no creator work and brokers no services. Its
                only authority is the care with which it keeps the record, so that is the thing we
                protect.
              </p>
            </Reveal>

            <Reveal as="div" delay={0.08} className="flex flex-col gap-10 lg:col-span-5">
              <div className="border-stone-deep border p-7">
                <h2 className="palma-label text-taupe-deep mb-4">What PALMA will not do</h2>
                <ul className="text-taupe-deep flex flex-col gap-3 text-sm leading-relaxed">
                  <li>Sell a nomination, a shortlist place or an honour.</li>
                  <li>Let a sponsor see a score, meet a judge, or change an outcome.</li>
                  <li>Rank creators by audience size.</li>
                  <li>Host explicit material or broker services of any kind.</li>
                  <li>Publish judging scores, panel deliberations or nomination evidence.</li>
                  <li>Quietly edit the record. Corrections are audited.</li>
                </ul>
              </div>

              <div className="border-stone-deep flex flex-col gap-4 border p-7">
                <PalmMark className="text-stone-deep h-10" />
                <p className="text-taupe-deep text-sm leading-relaxed">
                  The palm has stood for victory and honour for a very long time. PALMA takes the
                  idea, not the imagery: an engraved mark, a seal, a record.
                </p>
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="stone">
        <Container>
          <SectionHeading
            label="How it works"
            title="Four beats, published in advance"
            standfirst="A PALMA season runs the same way every year, and every date is published before nominations open."
          />

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Nominate',
                body: 'Anyone may nominate, including the creator. Nominating is free and cannot be bought. Volume does not advance anyone.',
              },
              {
                title: 'Shortlist',
                body: 'Every nomination is reviewed by a person for eligibility and integrity before it reaches a judge.',
              },
              {
                title: 'Finalists',
                body: 'Each eligible nomination is scored independently by at least three judges against five published criteria.',
              },
              {
                title: 'Winners',
                body: 'The panel’s ranking is confirmed by the chair, the honour is conferred, and the record is entered into the PaROH.',
              },
            ].map((step, index) => (
              <div key={step.title} className="border-ink flex flex-col gap-4 border-t-2 pt-5">
                <span className="palma-label text-taupe-deep">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="font-display text-2xl">{step.title}</h3>
                <p className="text-taupe-deep text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-wrap gap-3">
            <Button asChild size="sm" variant="outline">
              <Link href="/about/judging">How judging works</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/about/policy">Content policy</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
