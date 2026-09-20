import { PortalShell } from '@/components/palma/PortalShell';
import { EmptyState } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getJudgeHistory } from '@/server/data/judging';
import { JUDGING_NAV } from '@/lib/judging-nav';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Judging history',
  description: 'Your institutional record as a PALMA judge.',
  path: '/judge/history',
  noIndex: true,
});

export default async function JudgingHistoryPage() {
  const session = await requirePermission('judging:view_assignments', '/judge/history');
  const history = session.user.judgeId ? await getJudgeHistory(session.user.judgeId) : [];

  return (
    <PortalShell
      title="PALMA Judging"
      subtitle="My judging history"
      nav={JUDGING_NAV}
      activeHref="/judge/history"
      userName={session.user.name}
    >
      <p className="text-taupe-deep max-w-160 leading-relaxed">
        Your service record on the PALMA panel. It is not a trophy cabinet: it shows what you were
        asked to judge and whether you finished it, and never what you scored.
      </p>

      {history.length === 0 ? (
        <EmptyState
          className="mt-14"
          title="No seasons yet"
          description="Your first season appears here once cases are assigned to you."
        />
      ) : (
        <div className="mt-14 flex flex-col gap-14">
          {history.map((season) => {
            const complete = season.completed >= season.assigned;

            return (
              <section key={season.year}>
                <div className="border-stone-deep flex flex-wrap items-baseline justify-between gap-4 border-b pb-4">
                  <h2 className="font-display text-3xl">{season.title}</h2>
                  <span
                    className={cn('palma-label', complete ? 'text-olive' : 'text-champagne-deep')}
                  >
                    {complete ? 'Complete' : `${season.completed} of ${season.assigned} assessed`}
                  </span>
                </div>

                <ul className="flex flex-col">
                  {season.categories.map((category) => {
                    const done = category.completed >= category.assigned;
                    return (
                      <li
                        key={category.categoryName}
                        className="palma-row border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-4 border-b py-4 last:border-none"
                      >
                        <span className="palma-row-lead font-display text-lg">
                          {category.categoryName}
                        </span>
                        <span className="flex items-baseline gap-5">
                          <span className="text-taupe text-sm tabular-nums">
                            {category.completed}/{category.assigned}
                          </span>
                          <span
                            className={cn('palma-label', done ? 'text-olive' : 'text-taupe-deep')}
                          >
                            {done ? '✓ Completed' : 'Outstanding'}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
