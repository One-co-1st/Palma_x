import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type StatEntry = {
  label: string;
  value: number | string;
  note?: string;
  href?: string;
  tone?: 'default' | 'attention';
};

export function StatGrid({
  title,
  stats,
  icon: Icon,
}: {
  title: string;
  stats: StatEntry[];
  icon?: LucideIcon;
}) {
  return (
    <section>
      <div className="border-stone-deep flex items-center gap-2.5 border-b pb-3">
        {Icon ? <Icon className="text-taupe size-4 shrink-0" strokeWidth={1.5} /> : null}
        <h3 className="palma-label text-taupe-deep">{title}</h3>
      </div>

      <dl className="-mr-px grid grid-cols-2 overflow-hidden sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const body = (
            <>
              <dt className="palma-label text-taupe-deep text-[10px]">{stat.label}</dt>
              <dd
                className={cn(
                  'font-display mt-2 text-4xl tabular-nums',
                  stat.tone === 'attention' && Number(stat.value) > 0 && 'text-olive',
                )}
              >
                {typeof stat.value === 'number'
                  ? new Intl.NumberFormat('en-GB').format(stat.value)
                  : stat.value}
              </dd>
              {stat.note ? (
                <dd className="text-taupe mt-1.5 text-xs leading-relaxed">{stat.note}</dd>
              ) : null}
            </>
          );

          return stat.href ? (
            <Link
              key={stat.label}
              href={stat.href}
              className="palma-row group border-stone-deep/60 -mb-px flex min-w-0 flex-col border-r border-b py-5 pr-5 pl-5 transition-colors hover:bg-stone/15 first:pl-0"
            >
              {body}
              <dd className="mt-2">
                <ArrowUpRight className="text-taupe size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </dd>
            </Link>
          ) : (
            <div
              key={stat.label}
              className="border-stone-deep/60 -mb-px flex min-w-0 flex-col border-r border-b py-5 pr-5 pl-5 first:pl-0"
            >
              {body}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
