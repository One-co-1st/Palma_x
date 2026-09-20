import Link from 'next/link';
import { PalmMark } from '@/components/brand/PalmMark';
import { EditorialImage } from './EditorialImage';
import { Container } from './layout';
import { countryName } from '@/lib/format';
import type { PalmaLaureate } from '@/server/data/types';

/**
 * THE PALMA, as it appears in public.
 *
 * The brief for this component was that its standing must be legible from the
 * design rather than from the words, and that this has to survive a phone.
 * Saying "the highest honour" in a caption is exactly the thing that does not
 * work: every award in the world claims that in its copy.
 *
 * So the hierarchy is structural, and it is the same on every screen:
 *
 * - **It leaves the grid.** Category winners are cards in a three-column grid
 *   on a pale ground. This is a full-bleed band of ink that interrupts the
 *   page. On a phone the grid becomes one column and cards start to look alike,
 *   which is precisely where a ground change keeps working and a bigger heading
 *   stops.
 * - **It is framed.** A champagne hairline inset on all four sides, which is
 *   the border of a certificate rather than the edge of a card. Nothing else on
 *   the site is framed.
 * - **It carries the crowned mark at scale**, struck behind the name as a
 *   watermark. The crown is the same thing that separates the two trophies: THE
 *   PALMA has it, the category PALMA does not.
 * - **The name is the largest type PALMA sets.** Not a step up from a winner's
 *   name, a different order of size, down to 390px wide.
 * - **It is never in a list.** There is one, so it is never rendered in a loop
 *   and never has a sibling beside it to be compared against.
 *
 * The one word of copy that does the work is the honour's own name, which is
 * why THE PALMA is set in champagne above the laureate and nothing is added
 * after it.
 */
export function TheLaureate({
  laureate,
  seasonTitle,
  headingLevel = 'h2',
}: {
  laureate: PalmaLaureate;
  seasonTitle: string;
  headingLevel?: 'h1' | 'h2';
}) {
  const Heading = headingLevel;
  const country = countryName(laureate.creator.countryCode);

  return (
    <section
      aria-label={`THE PALMA ${laureate.year}`}
      className="on-ink bg-ink text-ivory relative isolate overflow-hidden"
    >
      {/* The frame. Inset on every side, and it holds its inset on a phone
          rather than collapsing, because the frame is the signal. */}
      <div
        aria-hidden="true"
        className="border-champagne/30 pointer-events-none absolute inset-3 border sm:inset-5"
      />
      <div
        aria-hidden="true"
        className="border-champagne/12 pointer-events-none absolute inset-4.5 border sm:inset-7"
      />

      {/* The mark, struck large behind the name. Cropped deliberately: an
          object too big for its frame reads as bigger than the frame. */}
      <PalmMark
        aria-hidden="true"
        className="text-champagne/7 pointer-events-none absolute -top-10 -right-6 h-[130%] w-auto sm:-right-4 lg:right-12"
      />

      <Container className="relative py-20 sm:py-28 lg:py-36">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="flex flex-col gap-8 lg:col-span-7">
            <div className="flex flex-col gap-3">
              <span className="palma-label text-champagne text-[0.8125rem] tracking-[0.3em]">
                THE PALMA
              </span>
              <span className="text-ivory/45 text-sm tracking-[0.2em] uppercase">
                {seasonTitle}
              </span>
            </div>

            <Heading className="font-display text-[clamp(2.75rem,12vw,8.5rem)] leading-[0.88] tracking-tight">
              {laureate.creator.displayName}
            </Heading>

            <div className="border-champagne/25 flex flex-col gap-6 border-t pt-8">
              {laureate.citation ? (
                <p className="font-display text-ivory/80 max-w-160 text-lg leading-relaxed text-balance sm:text-xl">
                  {laureate.citation}
                </p>
              ) : null}

              <dl className="text-ivory/50 flex flex-wrap gap-x-10 gap-y-3 text-xs">
                <div className="flex flex-col gap-1">
                  <dt className="tracking-[0.18em] uppercase">Conferred</dt>
                  <dd className="text-ivory/75 tabular-nums">{laureate.year}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="tracking-[0.18em] uppercase">Recipients</dt>
                  <dd className="text-ivory/75">One a year</dd>
                </div>
                {country ? (
                  <div className="flex flex-col gap-1">
                    <dt className="tracking-[0.18em] uppercase">Country</dt>
                    <dd className="text-ivory/75">{country}</dd>
                  </div>
                ) : null}
                {laureate.code ? (
                  <div className="flex flex-col gap-1">
                    <dt className="tracking-[0.18em] uppercase">Verification</dt>
                    <dd>
                      <Link
                        href={`/verify/${laureate.code}`}
                        className="text-champagne/90 hover:text-champagne font-mono tracking-wider"
                      >
                        {laureate.code}
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          {/* The portrait is framed in champagne and sits lower than the name,
              so the eye reaches the name first on every screen. */}
          <div className="lg:col-span-5">
            <Link
              href={`/creators/${laureate.creator.slug}`}
              className="group block max-w-90 lg:ml-auto lg:max-w-none"
            >
              <div className="border-champagne/35 border p-2">
                <EditorialImage
                  name={laureate.creator.displayName}
                  src={laureate.creator.portraitUrl}
                  alt={laureate.creator.portraitAlt}
                  ratio="portrait"
                />
              </div>
              <span className="palma-label text-champagne/70 group-hover:text-champagne mt-4 block transition-colors">
                The record
              </span>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

/**
 * THE PALMA where a full band would be too much.
 *
 * The PaROH lists every year, so the band above cannot repeat down the page
 * without becoming wallpaper. This is the same argument made briefly: still a
 * plate of ink on a pale page, still framed in champagne, still carrying the
 * crowned mark, and still sitting above the category winners rather than among
 * them. It is a different size, not a different rank.
 *
 * A row in that list is a category name and a creator name on a hairline. This
 * is not a row, at any width.
 */
export function LaureatePlate({ laureate }: { laureate: PalmaLaureate }) {
  return (
    <div className="on-ink bg-ink text-ivory relative isolate mt-2 overflow-hidden">
      <div
        aria-hidden="true"
        className="border-champagne/30 pointer-events-none absolute inset-2 border"
      />
      <PalmMark
        aria-hidden="true"
        className="text-champagne/8 pointer-events-none absolute -top-6 right-4 h-[150%] w-auto"
      />

      <Link
        href={`/creators/${laureate.creator.slug}`}
        className="group relative flex flex-col gap-4 p-7 sm:p-9"
      >
        <span className="palma-label text-champagne text-[0.75rem] tracking-[0.28em]">
          THE PALMA
        </span>
        <span className="font-display group-hover:text-champagne text-[clamp(2rem,7vw,3.5rem)] leading-[0.95] transition-colors">
          {laureate.creator.displayName}
        </span>
        {laureate.citation ? (
          <p className="font-display text-ivory/70 max-w-140 leading-relaxed text-balance">
            {laureate.citation}
          </p>
        ) : null}
        <span className="text-ivory/40 text-xs tracking-[0.18em] uppercase">
          One recipient a year
        </span>
      </Link>
    </div>
  );
}
