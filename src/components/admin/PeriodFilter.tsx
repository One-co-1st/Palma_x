import Link from 'next/link';
import { PERIODS, PERIOD_LABEL, type Period } from '@/server/data/command-centre';
import { cn } from '@/lib/utils';

/** One row of filters above the figures, never buried in a dropdown. */
export function PeriodFilter({ period, basePath }: { period: Period; basePath: string }) {
  return (
    <nav aria-label="Period" className="flex flex-wrap gap-x-5 gap-y-2">
      {PERIODS.map((entry) => (
        <Link
          key={entry}
          href={entry === '30d' ? basePath : `${basePath}?period=${entry}`}
          aria-current={entry === period ? 'true' : undefined}
          className={cn(
            'palma-label border-b-2 pb-1 transition-colors',
            entry === period
              ? 'border-ink text-ink'
              : 'text-taupe hover:text-ink border-transparent',
          )}
        >
          {PERIOD_LABEL[entry]}
        </Link>
      ))}
    </nav>
  );
}
