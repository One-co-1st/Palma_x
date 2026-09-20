import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { EditorialImage } from './EditorialImage';
import { VerificationBadge } from './badges';
import { countryName } from '@/lib/format';
import { cn, ordinal, pluralise } from '@/lib/utils';
import type { CreatorSummary } from '@/server/data/types';

/**
 * The editorial creator card.
 *
 * On approach: the portrait pushes in a fraction, a rule travels the width of
 * the name, the arrow advances, and the honour line surfaces. Four movements,
 * one easing, one gesture — the card acknowledges the reader rather than
 * lifting off the page like a SaaS tile.
 */
export function CreatorCard({
  creator,
  index,
  className,
  priority = false,
  showStatus = true,
}: {
  creator: CreatorSummary;
  index?: number;
  className?: string;
  priority?: boolean;
  showStatus?: boolean;
}) {
  return (
    <Link
      href={`/creators/${creator.slug}`}
      className={cn(
        'group/card flex flex-col gap-4 focus:outline-none',
        'focus-visible:ring-olive focus-visible:ring-offset-ivory focus-visible:ring-2 focus-visible:ring-offset-4',
        className,
      )}
    >
      <div className="palma-card-media relative">
        <EditorialImage
          name={creator.displayName}
          src={creator.portraitUrl}
          alt={creator.portraitAlt}
          priority={priority}
        />
        {typeof index === 'number' ? (
          <span className="palma-label bg-ivory/90 text-ink absolute top-4 left-4 px-2 py-1.5">
            {ordinal(index)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="group-hover/card:text-olive text-xl leading-tight transition-colors duration-200">
              {creator.displayName}
            </h3>
            <ArrowUpRight
              className="palma-advance text-taupe mt-1 size-4 shrink-0"
              aria-hidden="true"
            />
          </div>
          <span aria-hidden="true" className="palma-card-rule bg-ink/40 block h-px w-full" />
        </div>

        <p className="palma-label text-taupe-deep">{countryName(creator.countryCode)}</p>

        {creator.headline ? (
          <p className="text-taupe-deep line-clamp-2 text-sm leading-relaxed">{creator.headline}</p>
        ) : null}

        {showStatus ? (
          <div className="mt-1 flex min-h-7 flex-wrap items-center gap-2">
            <VerificationBadge status={creator.verificationStatus} />
            {creator.honourCount > 0 ? (
              <span className="palma-label palma-card-surface text-champagne-deep">
                {creator.honourCount} PALMA {pluralise(creator.honourCount, 'honour')}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
