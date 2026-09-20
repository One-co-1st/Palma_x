import Image from 'next/image';
import { cn } from '@/lib/utils';

const FIELDS = [
  'from-stone to-stone-deep',
  'from-olive/85 to-olive',
  'from-ink-muted to-ink',
  'from-taupe to-taupe-deep',
] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Deterministic field selection, so a creator always gets the same plate. */
function fieldFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return FIELDS[hash % FIELDS.length]!;
}

export type EditorialImageProps = {
  src?: string | null;
  alt?: string | null;
  name: string;
  className?: string;
  ratio?: 'portrait' | 'square' | 'landscape';
  sizes?: string;
  priority?: boolean;
};

/**
 * Editorial imagery with an engraved fallback plate.
 *
 * PALMA never renders a stock photograph and never renders explicit imagery.
 * Where no approved portrait exists, the creator gets an institutional plate:
 * their initials set in the display face over a palm engraving.
 */
export function EditorialImage({
  src,
  alt,
  name,
  className,
  ratio = 'portrait',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  priority = false,
}: EditorialImageProps) {
  const ratios = {
    portrait: 'aspect-[3/4]',
    square: 'aspect-square',
    landscape: 'aspect-[16/10]',
  } as const;

  if (src) {
    return (
      <div className={cn('bg-stone relative overflow-hidden', ratios[ratio], className)}>
        <Image
          src={src}
          alt={alt ?? `${name}, PALMA creator portrait`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-700 ease-(--ease-ceremonial) group-hover:scale-[1.02]"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br',
        fieldFor(name),
        ratios[ratio],
        className,
      )}
      role="img"
      aria-label={`${name}, no approved portrait on file`}
    >
      <svg
        viewBox="0 0 200 260"
        className="text-ivory/18 absolute inset-0 h-full w-full"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="currentColor" strokeWidth="0.9" fill="none" strokeLinecap="round">
          <path d="M100 250V40" />
          <path d="M100 58C74 44 48 42 24 53" />
          <path d="M100 58c26-14 52-16 76-5" />
          <path d="M100 100C77 82 53 76 29 82" />
          <path d="M100 100c23-18 47-24 71-18" />
          <path d="M100 142c-21-19-42-28-63-26" />
          <path d="M100 142c21-19 42-28 63-26" />
          <path d="M100 184c-18-19-36-29-54-29" />
          <path d="M100 184c18-19 36-29 54-29" />
          <circle cx="100" cy="30" r="8" />
        </g>
      </svg>
      <span className="font-display text-ivory/85 relative text-4xl tracking-[0.12em]">
        {initials(name)}
      </span>
    </div>
  );
}
