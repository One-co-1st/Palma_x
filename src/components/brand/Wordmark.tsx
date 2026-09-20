import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PalmMark } from './PalmMark';

type WordmarkProps = {
  className?: string;
  /** `primary` is the wordmark alone; `lockup` adds the palm mark. */
  variant?: 'primary' | 'lockup';
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
  descriptor?: boolean;
};

const SIZES = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl sm:text-4xl',
} as const;

/**
 * The wordmark carries the brand. PALMA, never "Palma Awards".
 */
export function Wordmark({
  className,
  variant = 'primary',
  size = 'md',
  href = '/',
  descriptor = false,
}: WordmarkProps) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {variant === 'lockup' ? (
        <PalmMark className={cn(size === 'lg' ? 'h-9' : size === 'md' ? 'h-6' : 'h-5')} />
      ) : null}
      <span className="inline-flex flex-col">
        <span className={cn('palma-wordmark leading-none', SIZES[size])}>PALMA</span>
        {descriptor ? (
          <span className="palma-label text-taupe-deep mt-1.5">The Creator Honours</span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="PALMA. Home" className="inline-flex">
      {content}
    </Link>
  );
}
