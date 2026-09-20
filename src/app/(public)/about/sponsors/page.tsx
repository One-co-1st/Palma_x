import Link from 'next/link';
import { Container, Section, SectionHeading } from '@/components/palma/layout';
import { Masthead, MastheadPlate, PlateFact } from '@/components/palma/Masthead';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/primitives';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { CONTACTS } from '@/lib/legal';
import { listSponsors } from '@/server/data/queries';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'Partners',
  description:
    'Who supports PALMA, what a sponsorship buys, and the editorial independence statement that says exactly what it does not.',
  path: '/about/sponsors',
});

const TIER_LABEL = {
  headline: 'Headline partner',
  category_partner: 'Category partner',
  supporting: 'Supporting partner',
  media: 'Media partner',
} as const;

const TIER_ORDER = ['headline', 'category_partner', 'media', 'supporting'] as const;

export default async function SponsorsPage() {
  const sponsors = await listSponsors();

  const ordered = [...sponsors].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
  );

  return (
    <>
      <Masthead
        eyebrow="The institution"
        title="Partners"
        standfirst="Sponsorship pays for the ceremony, the archive and the staff who screen every nomination. It buys nothing else, and this page says so in detail."
        meta={[`${sponsors.length} partners`, 'No influence over judging', 'No access to scores']}
        plate={
          <MastheadPlate label="What sponsorship buys">
            <dl className="grid grid-cols-2 gap-5">
              <PlateFact term="Partners">{sponsors.length}</PlateFact>
              <PlateFact term="Judging influence">None</PlateFact>
              <PlateFact term="Score access">None</PlateFact>
              <PlateFact term="Judge contact">None</PlateFact>
            </dl>
          </MastheadPlate>
        }
      />

      <Section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="palma-prose lg:col-span-7">
              <h2 className="mb-4 text-3xl">Editorial independence</h2>
              <p>
                PALMA takes sponsorship, and is not embarrassed about it: an independent panel, a
                screening team, a permanent archive and a ceremony all cost money, and the
                alternative, charging creators to be nominated, would corrupt the thing itself.
              </p>
              <p>
                What matters is that the money and the judgement never touch. There is no route
                through which a sponsor can reach a judge, see a score, alter a shortlist or learn a
                result early. That is not a promise about behaviour; it is a fact about how the
                system is built. The judging tables carry no sponsor-readable relation, and there is
                no messaging path between a sponsor account and a judge account, because none was
                ever built.
              </p>
            </div>

            <aside className="lg:col-span-5">
              <Reveal>
                <div className="border-stone-deep border p-7">
                  <h2 className="palma-label text-taupe-deep mb-4">A sponsorship cannot buy</h2>
                  <ul className="text-taupe-deep flex flex-col gap-3 text-sm leading-relaxed">
                    <li>A nomination, a shortlist place, or an honour.</li>
                    <li>Sight of a score, a remark, or a nomination reason.</li>
                    <li>Contact with a judge through PALMA.</li>
                    <li>Advance notice of a finalist list or a winner.</li>
                    <li>Removal of a creator from consideration.</li>
                    <li>Any personal data about nominators or nominees.</li>
                  </ul>
                  <p className="text-taupe mt-5 text-xs leading-relaxed">
                    PALMA refuses sponsorship conditional on any of the above, and will say publicly
                    that it refused if asked.
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
            label="Current"
            title="Who supports PALMA"
            standfirst="Listed by tier. A category partner’s name appears on its category page; that is the entire extent of its involvement in that category."
          />

          {ordered.length === 0 ? (
            <EmptyState
              className="mt-12"
              title="No partners announced"
              description="Partners for the coming season are announced before nominations open."
            />
          ) : (
            <RevealGroup className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
              {ordered.map((sponsor) => (
                <RevealItem key={`${sponsor.slug}-${sponsor.categoryName ?? 'all'}`}>
                  <article className="palma-chip border-stone-deep bg-ivory flex h-full flex-col gap-4 border p-7">
                    <span className="palma-label text-champagne-deep">
                      {TIER_LABEL[sponsor.tier]}
                    </span>
                    <h3 className="font-display text-2xl leading-tight">{sponsor.name}</h3>
                    {sponsor.summary ? (
                      <p className="text-taupe-deep text-sm leading-relaxed">{sponsor.summary}</p>
                    ) : null}

                    <div className="border-stone-deep/60 mt-auto flex flex-col gap-2 border-t pt-4 text-xs">
                      {sponsor.categoryName ? (
                        <span className="text-taupe">
                          Category, <span className="text-ink">{sponsor.categoryName}</span>
                        </span>
                      ) : (
                        <span className="text-taupe">Across the season</span>
                      )}
                      {sponsor.websiteUrl ? (
                        <a
                          href={sponsor.websiteUrl}
                          rel="noopener noreferrer nofollow"
                          target="_blank"
                          className="palma-quiet-link text-taupe-deep hover:text-ink"
                        >
                          {sponsor.websiteUrl.replace(/^https?:\/\//, '')}
                        </a>
                      ) : null}
                    </div>
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
              <h2 className="text-3xl leading-tight sm:text-4xl">Partnering with PALMA</h2>
              <span aria-hidden="true" className="bg-stone-deep mt-5 block h-px w-full max-w-md" />
              <p className="text-taupe-deep mt-6 leading-relaxed">
                PALMA works with a small number of partners a season, and turns down more than it
                accepts. If the brief includes influence over an outcome, the answer is no before
                the conversation starts.
              </p>
              <Button asChild className="mt-8">
                <a href={`mailto:${CONTACTS.partnerships}`}>Talk to us</a>
              </Button>
            </div>

            <div className="lg:col-span-7">
              <ol className="flex flex-col">
                {[
                  {
                    title: 'What a partner gets',
                    body: 'Association with the season and the ceremony, presence on the relevant pages in PALMA’s own typography, a named seat at the ceremony, and the right to say truthfully that it supports the honours.',
                  },
                  {
                    title: 'What is disclosed',
                    body: 'Where a partner has a commercial relationship with a nominee, that relationship is disclosed on the category page. PALMA discloses rather than excludes, because excluding would quietly punish the creator.',
                  },
                  {
                    title: 'What PALMA will not sell',
                    body: 'Data. Not nominator addresses, not a mailing list, not aggregate behaviour about a creator’s audience. PALMA has no advertising business and does not intend to acquire one.',
                  },
                  {
                    title: 'How it ends',
                    body: 'A partnership that attempts to acquire influence is terminated, the association is removed from the site, and PALMA will not pretend afterwards that it was a mutual decision.',
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
                The binding version of all this is in the{' '}
                <Link href="/legal/rules" className="palma-link text-ink">
                  competition rules
                </Link>{' '}
                and the{' '}
                <Link href="/legal/terms" className="palma-link text-ink">
                  terms
                </Link>
                . Partner use of the PALMA name is governed by{' '}
                <Link href="/legal/mark" className="palma-link text-ink">
                  use of the mark
                </Link>
                .
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
