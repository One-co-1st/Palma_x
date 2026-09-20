import Link from 'next/link';
import { Container, Section } from '@/components/palma/layout';
import { Masthead, MastheadPlate, PlateFact } from '@/components/palma/Masthead';
import { NominateForm } from '@/components/nominate/NominateForm';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { acceptsNominations } from '@/domain/season';
import { formatDate } from '@/lib/format';
import { getCurrentSeason, listCategories } from '@/server/data/queries';

export const revalidate = 300;

export const metadata = buildMetadata({
  title: 'Nominate a creator',
  description:
    'Nominate a creator for a PALMA. It takes under a minute, needs no account, and costs nothing. The audience nominates, PALMA judges.',
  path: '/nominate',
});

export default async function NominatePage() {
  const season = await getCurrentSeason();
  const categories = await listCategories(season.year);
  const open = acceptsNominations(season.stage);

  return (
    <>
      <Masthead
        eyebrow={`${season.title} · Nominations`}
        title="Nominate a creator"
        titleLines={['Nominate', 'a creator']}
        figure={season.year}
        standfirst="Name someone, say why in a sentence, confirm your email. That is the whole of it, PALMA does the investigating."
        meta={[
          'Under a minute',
          'No account',
          'No evidence needed',
          season.nominationsCloseAt
            ? `Closes ${formatDate(season.nominationsCloseAt)}`
            : 'Open now',
        ]}
        plate={
          <MastheadPlate label="Audience nominates. PALMA judges.">
            <p className="text-ivory/75 text-sm leading-relaxed">
              A nomination is a signal, not a vote. The creator with the most does not win.
            </p>
            <dl className="border-ivory/15 grid grid-cols-2 gap-4 border-t pt-4">
              <PlateFact term="Cost">Nothing</PlateFact>
              <PlateFact term="Per person">One each</PlateFact>
            </dl>
          </MastheadPlate>
        }
      />

      <Section className="py-14 sm:py-20">
        <Container>
          {open ? (
            <div className="grid gap-14 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <NominateForm
                  categories={categories.map((entry) => ({
                    slug: entry.slug,
                    name: entry.name,
                    strapline: entry.strapline,
                  }))}
                />
              </div>

              <aside className="flex flex-col gap-6 lg:col-span-5 lg:pl-10">
                <Notice title="Audience nominates. PALMA judges.">
                  A nomination tells PALMA a creator is worth considering. It is not a vote, and the
                  creator with the most nominations does not win, an independent panel decides, from
                  evidence PALMA gathers itself.
                </Notice>

                <div className="border-stone-deep flex flex-col gap-4 border p-6">
                  <h2 className="palma-label text-taupe-deep">What we ask for</h2>
                  <ul className="text-taupe-deep flex flex-col gap-2 text-sm leading-relaxed">
                    <li>The creator’s name.</li>
                    <li>One category.</li>
                    <li>A sentence on why.</li>
                    <li>An email address, verified once.</li>
                  </ul>
                  <h2 className="palma-label text-taupe-deep mt-3">What we never ask for</h2>
                  <ul className="text-taupe-deep flex flex-col gap-2 text-sm leading-relaxed">
                    <li>An account, a password or a profile.</li>
                    <li>Evidence, files, screenshots or links.</li>
                    <li>Anything about you beyond the address.</li>
                  </ul>
                </div>

                <div className="border-stone-deep flex flex-col gap-3 border p-6">
                  <h2 className="palma-label text-taupe-deep">One signal each</h2>
                  <p className="text-taupe-deep text-sm leading-relaxed">
                    You can nominate one creator once per category, and as many different creators,
                    in as many categories, as you like. Repeat nominations of the same creator in
                    the same category do not stack.
                  </p>
                </div>
              </aside>
            </div>
          ) : (
            <EmptyState
              title="Nominations are closed"
              description={`Nominations for ${season.title} are not open. Finalists are announced on ${formatDate(season.finalistsAt)}.`}
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href={`/awards/${season.year}`}>Follow the season</Link>
                </Button>
              }
            />
          )}
        </Container>
      </Section>
    </>
  );
}
