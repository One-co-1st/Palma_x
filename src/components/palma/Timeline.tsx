import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

export type TimelineItem = {
  label: string;
  date: string | null;
  description?: string;
  state?: 'past' | 'current' | 'future';
};

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {items.map((item, index) => (
        <li
          key={`${item.label}-${index}`}
          className="border-stone-deep relative flex gap-5 border-l pb-8 pl-6 last:pb-0"
        >
          <span
            className={cn(
              'absolute top-1.5 -left-[4.5px] size-2 rounded-full',
              item.state === 'current'
                ? 'bg-champagne-deep ring-champagne/25 ring-4'
                : item.state === 'past'
                  ? 'bg-olive'
                  : 'bg-stone-deep',
            )}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-1.5">
            <span className="palma-label text-taupe-deep">{formatDate(item.date)}</span>
            <span className="font-display text-lg leading-snug">{item.label}</span>
            {item.description ? (
              <span className="text-taupe-deep text-sm leading-relaxed">{item.description}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
