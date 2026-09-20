import { AssignJudgesForm } from '@/components/admin/AdminForms';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { sql } from '@/server/db/sql';

export const metadata = buildMetadata({
  title: 'Judging',
  description: 'Assign PALMA judging panels.',
  path: '/admin/judging',
  noIndex: true,
});

export default async function AdminJudgingPage() {
  await requirePermission('admin:assign_judging', '/admin/judging');

  const categories = await sql<
    { id: string; name: string; eligibleCount: number; assignedCount: number }[]
  >`
    select
      c.id,
      c.name,
      (select count(*)::int from "Candidacy" cd
        where cd."categoryId" = c.id and cd.status = 'eligible') as "eligibleCount",
      (select count(*)::int from "JudgingAssignment" a
        where a."categoryId" = c.id) as "assignedCount"
    from "Category" c
    join "AwardYear" ay on ay.id = c."awardYearId"
    where ay."isCurrent" = true
    order by c.position asc
  `;

  const conflicts = await sql<
    { id: string; kind: string; candidacyId: string | null; creatorId: string | null; judgeName: string }[]
  >`
    select
      jc.id,
      jc.kind,
      jc."candidacyId",
      jc."creatorId",
      j."displayName" as "judgeName"
    from "JudgeConflict" jc
    join "Judge" j on j.id = jc."judgeId"
    where jc.status = 'declared'
    order by jc."declaredAt" desc
    limit 20
  `;

  return (
    <>
      <h1 className="text-3xl">Panel assignment</h1>
      <p className="text-taupe-deep mt-3 max-w-160 leading-relaxed">
        Assignment is deterministic and conflict-aware: each eligible candidacy is placed with three
        judges, load is spread evenly, and any judge with a declared conflict is excluded before
        placement. Running it twice adds only what is missing.
      </p>

      {categories.length === 0 ? (
        <EmptyState className="mt-10" title="No categories in the current season" />
      ) : (
        <div className="mt-10 flex flex-col gap-4">
          {categories.map((category) => (
            <AssignJudgesForm
              key={category.id}
              categoryId={category.id}
              categoryName={category.name}
              eligibleCount={category.eligibleCount}
              assignedCount={category.assignedCount}
            />
          ))}
        </div>
      )}

      {conflicts.length > 0 ? (
        <section className="mt-14">
          <h3 className="palma-label text-taupe-deep mb-5">Conflicts awaiting resolution</h3>
          <ul className="flex flex-col gap-3">
            {conflicts.map((conflict) => (
              <li
                key={conflict.id}
                className="border-stone-deep flex flex-wrap items-center justify-between gap-4 border p-5"
              >
                <span className="font-display text-lg">{conflict.judgeName}</span>
                <span className="palma-label text-taupe-deep">{conflict.kind}</span>
                <span className="text-taupe-deep text-sm">
                  {conflict.candidacyId ?? conflict.creatorId}
                </span>
              </li>
            ))}
          </ul>
          <Notice className="mt-6">
            A declared conflict has already removed the judge from the nomination. Dismissing one is
            a deliberate act and is written to the audit log.
          </Notice>
        </section>
      ) : null}
    </>
  );
}
