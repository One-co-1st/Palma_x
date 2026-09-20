import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getJudgeOverview } from '@/server/data/judging';
import { JUDGING_NAV, greeting } from '@/lib/judging-nav';
import { formatDate, formatShortDate } from '@/lib/format';
import { MIN_JUDGES_PER_CANDIDACY } from '@/domain/selection';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  Bell,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Play,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Judging',
  description: 'The PALMA judging room.',
  path: '/judge',
  noIndex: true,
});

export default async function JudgingOverviewPage() {
  const session = await requirePermission('judging:view_assignments', '/judge');
  const overview = session.user.judgeId
    ? await getJudgeOverview(session.user.judgeId, session.user.id)
    : null;

  if (!overview) {
    return (
      <PortalShell title="PALMA Judging" userName={session.user.name}>
        <EmptyState
          title="No panel membership"
          description="This account is not currently seated on a PALMA panel."
        />
      </PortalShell>
    );
  }

  const firstName = overview.judgeName.split(' ')[0] ?? overview.judgeName;
  const { counts, season } = overview;

  const statItems = [
    { icon: ClipboardList, label: 'Assigned', value: counts.assigned, color: 'text-ink' },
    { icon: CheckCircle2, label: 'Completed', value: counts.completed, color: 'text-olive' },
    { icon: Clock, label: 'Remaining', value: counts.remaining, color: 'text-champagne-deep' },
    { icon: XCircle, label: 'Recused', value: counts.recused, color: 'text-taupe' },
  ];

  return (
    <PortalShell
      title="PALMA Judging"
      subtitle={`${greeting()}, ${firstName}.`}
      nav={JUDGING_NAV}
      activeHref="/judge"
      userName={overview.judgeName}
    >
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-8">
          <p className="text-taupe-deep max-w-140 text-lg leading-relaxed">
            {counts.remaining === 0
              ? 'Your panel is clear. Every case assigned to you this season has been assessed.'
              : 'Your judging panel is ready.'}
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statItems.map((item) => (
              <div
                key={item.label}
                className="border-stone-deep flex flex-col gap-3 border p-5"
              >
                <div className="flex items-center gap-2">
                  <item.icon className={cn('size-4', item.color)} strokeWidth={1.5} />
                  <span className="palma-label text-taupe-deep">{item.label}</span>
                </div>
                <span className={cn('font-display text-5xl tabular-nums', item.color)}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <section className="mt-14">
            <div className="border-stone-deep flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-2.5">
                <ClipboardList className="text-taupe size-4" strokeWidth={1.5} />
                <h2 className="palma-label text-taupe-deep">Your assignments</h2>
              </div>
              <Link
                href="/judge/assignments"
                className="palma-link text-taupe-deep hover:text-ink flex items-center gap-1 text-sm"
              >
                Open the workspace
                <ChevronRight className="size-3.5" />
              </Link>
            </div>

            {overview.categories.length === 0 ? (
              <EmptyState
                className="mt-8"
                title="Nothing assigned yet"
                description="Cases are assigned once screening closes. You will be notified."
              />
            ) : (
              <ul className="flex flex-col">
                {overview.categories.map((category) => {
                  const done = category.completed >= category.assigned;
                  const started = category.completed > 0;
                  const pct = Math.round(
                    (category.completed / Math.max(1, category.assigned)) * 100,
                  );

                  return (
                    <li
                      key={category.categoryId}
                      className="palma-row group border-stone-deep border-b py-6 transition-colors hover:bg-stone/10"
                    >
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <span className="palma-row-lead font-display text-xl">
                          {category.categoryName}
                        </span>
                        <span className="flex items-center gap-3">
                          {done ? (
                            <span className="palma-label text-olive flex items-center gap-1.5">
                              <CheckCircle2 className="size-3.5" />
                              Complete
                            </span>
                          ) : category.nextAssignmentId ? (
                            <Link
                              href={`/judge/${category.nextAssignmentId}`}
                              className="palma-label text-ink palma-link flex items-center gap-1.5"
                            >
                              {started ? (
                                <>
                                  <Play className="size-3" />
                                  Continue
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="size-3.5" />
                                  Begin
                                </>
                              )}
                            </Link>
                          ) : null}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="bg-stone-deep/30 h-1.5 w-full overflow-hidden rounded-full">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                done ? 'bg-olive' : 'bg-champagne-deep',
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="palma-label text-taupe tabular-nums shrink-0 w-16 text-right">
                          {category.completed}/{category.assigned}
                        </span>
                      </div>

                      <span className="text-taupe text-xs mt-2 block">
                        {category.assigned} case{category.assigned !== 1 ? 's' : ''} assigned
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-8 lg:col-span-4">
          <div className="border-stone-deep border">
            <div className="p-7">
              <div className="flex items-center gap-2.5 mb-4">
                <Calendar className="text-taupe size-4" strokeWidth={1.5} />
                <h2 className="palma-label text-taupe-deep">{season.title}</h2>
              </div>
              <p className="font-display text-2xl leading-tight">
                {season.daysRemaining === null
                  ? 'No deadline published yet'
                  : season.daysRemaining === 0
                    ? 'Judging closes today'
                    : `Judging closes in ${season.daysRemaining} day${season.daysRemaining === 1 ? '' : 's'}`}
              </p>
              {season.closesAt ? (
                <p className="text-taupe-deep mt-2 text-sm">{formatDate(season.closesAt)}</p>
              ) : null}
            </div>

            {overview.isChair ? (
              <div className="border-stone-deep border-t p-7">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="text-champagne-deep mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
                  <p className="text-taupe text-xs leading-relaxed">
                    You chair this panel. You see the spread of scores before any list is confirmed, and
                    you score nothing yourself.
                  </p>
                </div>
              </div>
            ) : null}

            {season.daysRemaining !== null && season.daysRemaining <= 7 && season.daysRemaining > 0 ? (
              <div className="border-stone-deep border-t bg-champagne/12 p-5">
                <div className="flex items-center gap-2">
                  <Clock className="text-champagne-deep size-4" strokeWidth={2} />
                  <span className="palma-label text-champagne-deep">
                    {season.daysRemaining} day{season.daysRemaining === 1 ? '' : 's'} remaining
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-stone-deep border">
            <div className="flex items-center gap-2.5 border-stone-deep border-b px-7 py-4">
              <Bell className="text-taupe size-4" strokeWidth={1.5} />
              <h2 className="palma-label text-taupe-deep">Notices</h2>
            </div>
            {overview.notifications.length === 0 ? (
              <p className="text-taupe px-7 py-6 text-sm leading-relaxed">
                Nothing outstanding. PALMA only writes to you about assignments, reassignments,
                conflict decisions, deadlines and the opening and closing of judging.
              </p>
            ) : (
              <ul className="flex flex-col">
                {overview.notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className="border-stone-deep/60 flex flex-col gap-1.5 border-b px-7 py-4 last:border-none"
                  >
                    <span className="flex items-baseline justify-between gap-4">
                      <span className="font-display text-base">{notification.subject}</span>
                      <span className="palma-label text-taupe shrink-0">
                        {formatShortDate(notification.createdAt)}
                      </span>
                    </span>
                    <span className="text-taupe-deep text-sm leading-relaxed">
                      {notification.body}
                    </span>
                    {notification.href ? (
                      <Link href={notification.href} className="palma-link text-ink text-sm flex items-center gap-1">
                        Open <ChevronRight className="size-3" />
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-stone-deep border p-6">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="text-taupe mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
              <div>
                <h3 className="palma-label text-taupe-deep mb-2">How PALMA treats your work</h3>
                <p className="text-taupe-deep text-sm leading-relaxed">
                  Every case is scored independently by at least {MIN_JUDGES_PER_CANDIDACY} judges. You
                  are never shown another judge&rsquo;s score, and never shown how many people nominated a
                  creator. Submitted assessments are immutable.
                </p>
              </div>
            </div>
          </div>

          {counts.remaining > 0 && overview.categories[0]?.nextAssignmentId ? (
            <Button asChild size="lg" className="self-start">
              <Link
                href={`/judge/${overview.categories.find((c) => c.nextAssignmentId)?.nextAssignmentId}`}
              >
                <ArrowRight className="mr-2 size-4" />
                Open the next case
              </Link>
            </Button>
          ) : null}
        </aside>
      </div>
    </PortalShell>
  );
}
