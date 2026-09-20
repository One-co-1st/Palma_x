import Link from 'next/link';
import { DepthLayer, DepthItem } from '@/components/motion/illusion';
import { EditorialImage } from './EditorialImage';
import { CopyLink } from './CopyLink';
import { Button } from '@/components/ui/button';
import { Container } from './layout';
import { absoluteUrl } from '@/lib/seo';
import { countryName } from '@/lib/format';
import type { CategoryOutcome, SeasonView } from '@/server/data/types';

/**
 * The winner reveal.
 *
 * A PALMA is not announced with a toast. The sequence is deliberate — season,
 * category, pause, name, seal — and it degrades to a still, complete
 * composition under `prefers-reduced-motion`.
 */
export function WinnerReveal({
  outcome,
  season,
}: {
  outcome: CategoryOutcome;
  season: SeasonView;
}) {
  const winner = outcome.winner;
  if (!winner) return null;

  const verifyUrl = winner.code ? absoluteUrl(`/verify/${winner.code}`) : null;

  return (
    <section className="on-ink bg-ink text-ivory relative overflow-hidden">
      <Container className="relative py-24 sm:py-32">
        <div className="grid gap-16 lg:grid-cols-12 lg:items-center">
          <div className="flex flex-col gap-8 lg:col-span-7">
            <div
              className="flex flex-col gap-3 motion-safe:animate-(--animate-rise)"
              style={{ animationDelay: '120ms' }}
            >
              <span className="palma-label text-champagne">{season.title}</span>
              <span className="font-display text-ivory/70 text-2xl leading-tight sm:text-3xl">
                {outcome.category.name}
              </span>
            </div>

            <div
              className="flex flex-col gap-4 motion-safe:animate-(--animate-reveal)"
              style={{ animationDelay: '620ms' }}
            >
              <h2 className="text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">
                {winner.creator.displayName}
              </h2>
              <span className="palma-label text-champagne">Winner</span>
            </div>

            <div
              className="border-ivory/15 flex flex-col gap-6 border-t pt-8 motion-safe:animate-(--animate-rise)"
              style={{ animationDelay: '980ms' }}
            >
              {winner.citation ? (
                <p className="font-display text-ivory/75 max-w-130 text-xl leading-snug">
                  “{winner.citation}”
                </p>
              ) : null}

              <dl className="flex flex-wrap gap-x-12 gap-y-4">
                <div className="flex flex-col gap-1.5">
                  <dt className="palma-label text-ivory/45">Country</dt>
                  <dd className="text-sm">{countryName(winner.creator.countryCode)}</dd>
                </div>
                {winner.code ? (
                  <div className="flex flex-col gap-1.5">
                    <dt className="palma-label text-ivory/45">Verification</dt>
                    <dd className="font-mono text-sm tracking-wider">{winner.code}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild variant="ivory" size="sm">
                  <Link href={`/creators/${winner.creator.slug}`}>View the record</Link>
                </Button>
                {verifyUrl ? (
                  <>
                    <Button asChild variant="quiet" size="sm">
                      <Link href={`/verify/${winner.code}`}>Verify this honour</Link>
                    </Button>
                    <CopyLink value={verifyUrl} variant="quiet" />
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* The portrait, and only the portrait. The trophy belongs to THE
              PALMA, which is one honour a year; putting a rendered one under
              every category winner made the object ordinary. */}
          <DepthLayer
            className="mx-auto flex w-full max-w-80 flex-col items-center lg:col-span-5"
            strength={1.5}
          >
            <DepthItem depth={2.2} className="w-56 motion-safe:animate-(--animate-reveal)">
              <EditorialImage
                name={winner.creator.displayName}
                src={winner.creator.portraitUrl}
                alt={winner.creator.portraitAlt}
                sizes="(max-width: 1024px) 55vw, 14rem"
              />
            </DepthItem>
          </DepthLayer>
        </div>
      </Container>
    </section>
  );
}
