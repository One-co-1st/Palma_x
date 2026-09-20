import Image from 'next/image';
import type { Attribution } from '@/server/data/sponsorship';
import { cn } from '@/lib/utils';

/**
 * A sponsor's name, beside the thing they funded.
 *
 * Deliberately small and deliberately below. The category is the headline; the
 * sponsor is a line under it in the label face, with a logo at the size of a
 * caption rather than a banner. A page covered in logos is worth less to every
 * logo on it, which is the commercial argument for restraint as well as the
 * editorial one.
 *
 * It is also never a link that leaves quietly: the sponsor's site opens in a
 * new tab with `rel="sponsored"`, which is what that attribute is for and
 * keeps PALMA's own link graph honest.
 */
export function SponsorAttribution({
  attribution,
  tone = 'ivory',
  className,
}: {
  attribution: Attribution | null;
  tone?: 'ivory' | 'ink';
  className?: string;
}) {
  if (!attribution) return null;

  const muted = tone === 'ink' ? 'text-ivory/50' : 'text-taupe-deep';
  const strong = tone === 'ink' ? 'text-ivory/80' : 'text-ink';

  const name = attribution.websiteUrl ? (
    <a
      href={attribution.websiteUrl}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className={cn('palma-quiet-link', strong)}
    >
      {attribution.sponsorName}
    </a>
  ) : (
    <span className={strong}>{attribution.sponsorName}</span>
  );

  const prefix = attribution.line.replace(attribution.sponsorName, '').trim();

  return (
    <p className={cn('palma-label flex flex-wrap items-center gap-x-2 gap-y-1', muted, className)}>
      <span>{prefix}</span>
      {attribution.logoUrl ? (
        <Image
          src={attribution.logoUrl}
          alt={attribution.sponsorName}
          width={72}
          height={20}
          className="h-5 w-auto object-contain"
        />
      ) : (
        name
      )}
    </p>
  );
}
