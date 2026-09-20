import Link from 'next/link';
import { Container } from '@/components/palma/layout';
import { Button } from '@/components/ui/button';
import { PalmMark } from '@/components/brand/PalmMark';

/**
 * Not in the record.
 *
 * A 404 on this site is not an error page, it is the institution saying it
 * has looked and found nothing — which is a thing PALMA does elsewhere on
 * purpose, when a category is contested and no honour is conferred. So it is
 * written in the same voice rather than apologising, and it is built like the
 * laureate band: a full band of ink that interrupts the ivory, framed in
 * champagne, with the mark carried at scale.
 *
 * The mark engraves itself on arrival, stroke by stroke, crown last. That is
 * the only motion on the page and it is the whole idea: PALMA cuts a record,
 * and here it is cutting one that turns out to be empty.
 *
 * Every route out is one a lost reader actually wants: a code to check, the
 * archive, the categories, the way home. No "go back" button, which the
 * browser already has and does better.
 */
export default function NotFound() {
  return (
    <section className="on-ink bg-ink text-ivory relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="border-champagne/25 pointer-events-none absolute inset-3 border sm:inset-5"
      />
      <div
        aria-hidden="true"
        className="border-champagne/10 pointer-events-none absolute inset-4.5 border sm:inset-7"
      />

      <Container className="relative flex min-h-[70vh] flex-col justify-center py-20 sm:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-8 lg:col-span-7">
            <div className="flex flex-col gap-3">
              <span className="palma-label text-champagne text-[0.8125rem] tracking-[0.3em]">
                404
              </span>
              <h1 className="font-display text-[clamp(2.5rem,9vw,5.5rem)] leading-[0.92] tracking-tight">
                Not in the record
              </h1>
            </div>

            <div className="border-champagne/25 flex flex-col gap-6 border-t pt-8">
              <p className="font-display text-ivory/80 max-w-140 text-lg leading-relaxed text-balance">
                This page does not exist, or the honour it named was never conferred. PALMA keeps
                both kinds of silence, and does not invent a page to cover either.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="md" variant="ivory">
                  <Link href="/verify">Check a code</Link>
                </Button>
                {/* `quiet`, not `outline`: outline draws an ink border, which on
                    an ink ground is an invisible button. */}
                <Button asChild size="md" variant="quiet">
                  <Link href="/paroh" className="palma-label-brand">
                    Enter the PaROH
                  </Link>
                </Button>
              </div>

              {/* An index, not four links left under the buttons.

                  On a phone these are the routes a lost reader is most likely
                  to take, so they get the width: a two-by-two block of ruled
                  cells with aligned edges and a mark that moves on press. From
                  `sm` up the row has room to sit inline and a grid would only
                  add furniture. */}
              <nav aria-label="Elsewhere on PALMA" className="pt-2">
                <h2 className="palma-label text-ivory/35 text-[0.6875rem] tracking-[0.2em]">
                  Elsewhere
                </h2>
                <ul className="mt-3 grid grid-cols-2 gap-x-6 sm:mt-4 sm:flex sm:flex-wrap sm:gap-x-7">
                  {[
                    { href: '/', label: 'Home' },
                    { href: '/the-palma', label: 'THE PALMA' },
                    { href: '/categories', label: 'Categories' },
                    { href: '/winners', label: 'Winners' },
                  ].map((item) => (
                    <li key={item.href} className="border-ivory/12 border-t sm:border-0">
                      <Link
                        href={item.href}
                        className="group/out text-ivory/60 hover:text-ivory flex items-center justify-between gap-3 py-3 text-sm transition-colors sm:justify-start sm:py-0"
                      >
                        <span className="palma-quiet-link">{item.label}</span>
                        <svg
                          viewBox="0 0 12 12"
                          aria-hidden="true"
                          className="text-champagne/45 group-hover/out:text-champagne h-2.5 w-2.5 shrink-0 transition-all duration-200 group-hover/out:translate-x-0.5 sm:hidden"
                        >
                          <path
                            d="M3 9 9 3M9 3H4.4M9 3v4.6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>

          {/* Struck rather than shown. The one piece of motion on the page. */}
          <div className="lg:col-span-5">
            <PalmMark
              draw
              className="text-champagne/70 mx-auto h-56 w-auto sm:h-72 lg:mr-0 lg:ml-auto lg:h-96"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
