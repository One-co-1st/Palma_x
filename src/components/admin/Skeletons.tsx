import { Skeleton } from '@/components/ui/feedback';

/**
 * Loading states.
 *
 * Shaped like the thing that is coming rather than a spinner, so the page does
 * not reflow when the data lands. Each one is wrapped in a Suspense boundary
 * on its own section: the statistics arrive when they are counted, and the
 * page around them is already there.
 */

export function StatGridSkeleton({ title, count = 6 }: { title: string; count?: number }) {
  return (
    <section aria-busy="true">
      <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="border-stone-deep/60 -mb-px flex flex-col gap-3 border-r border-b py-5 pr-4 last:border-r-0"
          >
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-9 w-14" />
          </div>
        ))}
      </div>
      <span className="sr-only">Counting {title.toLowerCase()}…</span>
    </section>
  );
}

export function ChartSkeleton({ title }: { title: string }) {
  return (
    <figure aria-busy="true" className="border-stone-deep flex flex-col gap-5 border p-6">
      <figcaption className="palma-label text-taupe-deep">{title}</figcaption>
      <div className="flex flex-col gap-3">
        {[92, 74, 58, 41, 30].map((width) => (
          <div key={width} className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="h-2.5 w-8" />
            </div>
            <Skeleton className="h-2" style={{ width: `${width}%` }} />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading {title.toLowerCase()}…</span>
    </figure>
  );
}

export function SectionSkeleton({ title, rows = 5 }: { title: string; rows?: number }) {
  return (
    <section aria-busy="true">
      <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">{title}</h2>
      <ul className="flex flex-col">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="border-stone-deep/60 flex flex-col gap-2 border-b py-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-2.5 w-72 max-w-full" />
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading {title.toLowerCase()}…</span>
    </section>
  );
}
