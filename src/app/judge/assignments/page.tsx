import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { EmptyState } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getJudgeOverview, type AssignmentSummary } from '@/server/data/judging';
import { JUDGING_NAV } from '@/lib/judging-nav';
import { formatShortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'My judging',
  description: 'Cases awaiting assessment.',
  path: '/judge/assignments',
  noIndex: true,
});

export default async function MyJudgingPage() {
  const session = await requirePermission('judging:view_assignments', '/judge/assignments');
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

  return (
    <PortalShell
      title="PALMA Judging"
      subtitle="My judging"
      nav={JUDGING_NAV}
      activeHref="/judge/assignments"
      userName={overview.judgeName}
    >
      <p className="text-taupe-deep max-w-160 leading-relaxed">
        Three states, and a case can only move forwards through them. Opening a case means declaring
        you have no conflict; submitting an assessment locks it.
      </p>

      <div className="mt-14 flex flex-col gap-16">
        <Group
          title="To review"
          note="Cases PALMA has prepared and assigned to you. Nothing has been opened yet."
          assignments={overview.toReview}
          emptyTitle="Nothing waiting"
          emptyDescription="Every case assigned to you has been opened."
          action="Begin review"
        />

        <Group
          title="In progress"
          note="Opened, no conflict declared, assessment not yet submitted."
          assignments={overview.inProgress}
          emptyTitle="Nothing in progress"
          emptyDescription="You have no half-finished assessments."
          action="Continue"
        />

        <Group
          title="Completed"
          note="Submitted and locked. These cannot be edited."
          assignments={overview.completed}
          emptyTitle="Nothing completed yet"
          emptyDescription="Submitted assessments appear here."
        />

        {overview.recused.length > 0 ? (
          <Group
            title="Recused"
            note="You declared a conflict. An administrator reassigns these; you cannot see them again."
            assignments={overview.recused}
            emptyTitle=""
            emptyDescription=""
          />
        ) : null}
      </div>
    </PortalShell>
  );
}

function Group({
  title,
  note,
  assignments,
  emptyTitle,
  emptyDescription,
  action,
}: {
  title: string;
  note: string;
  assignments: AssignmentSummary[];
  emptyTitle: string;
  emptyDescription: string;
  action?: string;
}) {
  const byCategory = new Map<string, AssignmentSummary[]>();
  for (const assignment of assignments) {
    byCategory.set(assignment.categoryName, [
      ...(byCategory.get(assignment.categoryName) ?? []),
      assignment,
    ]);
  }

  return (
    <section>
      <div className="border-stone-deep flex flex-wrap items-baseline justify-between gap-4 border-b pb-4">
        <h2 className="palma-label text-taupe-deep">{title}</h2>
        <span className="palma-label text-taupe tabular-nums">{assignments.length}</span>
      </div>
      <p className="text-taupe mt-4 max-w-140 text-sm leading-relaxed">{note}</p>

      {assignments.length === 0 ? (
        <EmptyState className="mt-8" title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="mt-8 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
          {[...byCategory.entries()].map(([categoryName, group]) => {
            const remaining = group.filter((entry) => entry.status !== 'completed').length;
            const first = group[0];
            if (!first) return null;

            return (
              <article
                key={categoryName}
                className="palma-chip border-stone-deep flex h-full flex-col gap-4 border p-7"
              >
                <span className="palma-label text-champagne-deep">{categoryName}</span>
                <p className="text-taupe-deep text-sm">PALMA {first.year}</p>

                <dl className="border-stone-deep/60 flex flex-col gap-2 border-t pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-taupe">Candidates</dt>
                    <dd className="tabular-nums">{group.length}</dd>
                  </div>
                  {action ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-taupe">Remaining</dt>
                      <dd className="tabular-nums">{remaining}</dd>
                    </div>
                  ) : (
                    <div className="flex justify-between gap-4">
                      <dt className="text-taupe">Submitted</dt>
                      <dd className="tabular-nums">
                        {first.completedAt ? formatShortDate(first.completedAt) : '—'}
                      </dd>
                    </div>
                  )}
                </dl>

                <ul className="mt-auto flex flex-col">
                  {group.map((assignment) => (
                    <li
                      key={assignment.id}
                      className="border-stone-deep/40 flex items-baseline justify-between gap-4 border-t py-2.5 text-sm"
                    >
                      <span className="font-display text-base">{assignment.creatorName}</span>
                      {action ? (
                        <Link
                          href={`/judge/${assignment.id}`}
                          className="palma-label text-ink palma-link shrink-0"
                        >
                          {action}
                        </Link>
                      ) : (
                        <span className="palma-label text-taupe shrink-0">
                          {assignment.status === 'completed' ? 'Locked' : 'Recused'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
