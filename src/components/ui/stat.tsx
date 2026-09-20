import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';

export function Stat({
  label,
  value,
  hint,
  className,
  tone = 'light',
}: {
  label: string;
  value: number | string;
  hint?: string;
  className?: string;
  tone?: 'light' | 'dark';
}) {
  return (
    <div className={cn('palma-stat flex flex-col gap-1.5', className)}>
      <span className={cn('palma-label', tone === 'dark' ? 'text-ivory/55' : 'text-taupe-deep')}>
        {label}
      </span>
      <span className="font-display text-3xl leading-none tabular-nums sm:text-4xl">
        {typeof value === 'number' ? formatNumber(value) : value}
      </span>
      {hint ? (
        <span className={cn('text-xs', tone === 'dark' ? 'text-ivory/45' : 'text-taupe-deep')}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
