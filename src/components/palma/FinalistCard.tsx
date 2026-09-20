import Link from 'next/link';
import { EditorialImage } from './EditorialImage';
import { countryName } from '@/lib/format';
import { cn, ordinal } from '@/lib/utils';
import { pigmentStyle } from '@/lib/category-identity';
import type { FinalistView } from '@/server/data/types';

/**
 * The finalist showcase card: large type, generous image, minimal metadata.
 */
export function FinalistCard({
  finalist,
  index,
  className,
  categorySlug,
}: {
  finalist: FinalistView;
  index: number;
  className?: string;
  /** Carries the category's pigment through to the showcase. */
  categorySlug?: string;
}) {
  return (
    <Link
      href={`/creators/${finalist.creator.slug}`}
      className={cn('group/card flex flex-col gap-5 focus:outline-none', className)}
      style={categorySlug ? pigmentStyle(categorySlug) : undefined}
    >
      <div className="relative flex items-baseline gap-4 border-t border-current/20 pt-4">
        <span
          aria-hidden="true"
          className="palma-pigment-rule palma-card-rule absolute -top-px left-0 h-0.5 w-full"
        />
        <span className="palma-label palma-pigment-text opacity-90">{ordinal(index)}</span>
        <span className="palma-label opacity-60">{countryName(finalist.creator.countryCode)}</span>
      </div>

      {/* The portrait arrives desaturated and resolves on approach, a finalist
          coming into focus, which is what this page is about. */}
      <div className="palma-card-media">
        <EditorialImage
          name={finalist.creator.displayName}
          src={finalist.creator.portraitUrl}
          alt={finalist.creator.portraitAlt}
          className="grayscale-[22%] transition-[filter] duration-700 ease-(--ease-ceremonial) group-hover/card:grayscale-0"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <h3 className="text-2xl leading-tight sm:text-3xl">{finalist.creator.displayName}</h3>
        <span aria-hidden="true" className="palma-card-rule block h-px w-full bg-current/40" />
      </div>

      {finalist.creator.headline ? (
        <p className="-mt-2 line-clamp-2 text-sm leading-relaxed opacity-60">
          {finalist.creator.headline}
        </p>
      ) : null}
    </Link>
  );
}
