import { ThePalmaDecision, ThePalmaForm } from '@/components/admin/AdminForms';
import { Notice } from '@/components/ui/feedback';
import { sql } from '@/server/db/sql';
import { CONSIDERATIONS, NOT_MEASURED, THE_PALMA_CRITERION } from '@/domain/the-palma';
import { can } from '@/lib/auth/rbac';
import { currentRole } from '@/lib/auth/guards';

/**
 * THE PALMA desk.
 *
 * One implementation, rendered at both `/portal/the-palma` and
 * `/admin/the-palma`. Conferring it is desk work: the panel decides, and an
 * operator records the decision, the same way every other entry in the record
 * is made. Administration keeps its own door to the same screen because the
 * audit log, not the URL, is what says who did it.
 *
 * Written as a component rather than duplicated across two routes because two
 * copies of a screen this consequential is two places for the rules to drift.
 */
export async function ThePalmaDesk() {
  const role = await currentRole();
  const mayPropose = can(role, 'honours:propose_the_palma');
  const mayConfer = can(role, 'honours:confer_the_palma');

  const [seasons, creators, proposals, conferred] = await Promise.all([
    sql<{ id: string; year: number; title: string }[]>`
      SELECT "id", "year", "title"
      FROM "AwardYear"
      ORDER BY "year" DESC
    `,
    sql<{ id: string; displayName: string }[]>`
      SELECT "id", "displayName"
      FROM "Creator"
      WHERE "isPublished" AND NOT "isSuspended"
      ORDER BY "displayName" ASC
      LIMIT 500
    `,
    sql<{ id: string; entityId: string; subject: string; reason: string; requestedByName: string }[]>`
      SELECT
        ca."id",
        ca."entityId",
        ca."subject",
        ca."reason",
        u."name" AS "requestedByName"
      FROM "ConsequentialAction" ca
      JOIN "User" u ON u."id" = ca."requestedById"
      WHERE ca."kind" = 'the_palma_conferral'
        AND ca."executedAt" IS NULL
        AND ca."cancelledAt" IS NULL
      ORDER BY ca."createdAt" DESC
    `,
    sql<
      {
        id: string;
        citation: string | null;
        year: number;
        creatorDisplayName: string;
        achievementCode: string | null;
      }[]
    >`
      SELECT
        h."id",
        h."citation",
        ay."year",
        c."displayName" AS "creatorDisplayName",
        a."code" AS "achievementCode"
      FROM "Honour" h
      JOIN "AwardYear" ay ON ay."id" = h."awardYearId"
      JOIN "Creator" c ON c."id" = h."creatorId"
      LEFT JOIN "Achievement" a ON a."honourId" = h."id"
      WHERE h."kind" = 'the_palma' AND h."state" = 'active'
      ORDER BY ay."year" DESC
    `,
  ]);

  const taken = new Set(conferred.map((honour) => honour.year));
  const open = seasons.filter((season) => !taken.has(season.year));

  return (
    <>
      <h1 className="text-3xl">THE PALMA</h1>

      <Notice className="mt-5" title="What this screen does">
        {THE_PALMA_CRITERION} It is conferred once a season, never shared, and never given to the
        same creator twice. There is no nomination behind it and no shortlist it comes through.
      </Notice>

      <section className="border-stone-deep mt-12 border p-7">
        <h2 className="font-display text-2xl">Conferred</h2>
        {conferred.length === 0 ? (
          <p className="text-taupe-deep mt-4 text-sm">None yet.</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-6">
            {conferred.map((honour) => (
              <li key={honour.id} className="border-stone-deep flex flex-col gap-2 border-t pt-5">
                <div className="flex flex-wrap items-baseline gap-x-4">
                  <span className="font-display text-xl">{honour.creatorDisplayName}</span>
                  <span className="palma-label text-taupe-deep tabular-nums">{honour.year}</span>
                  {honour.achievementCode ? (
                    <span className="text-taupe-deep font-mono text-xs">
                      {honour.achievementCode}
                    </span>
                  ) : null}
                </div>
                {honour.citation ? (
                  <p className="text-taupe-deep max-w-160 text-sm leading-relaxed">
                    {honour.citation}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Awaiting a second signature. Shown to both desks: the desk that wrote
          it needs to see that it is still waiting, and the person who can
          confer it needs somewhere to do that. */}
      {proposals.length > 0 ? (
        <section className="border-champagne-deep mt-10 border p-7">
          <h2 className="font-display text-2xl">Awaiting a second signature</h2>
          <ul className="mt-6 flex flex-col gap-8">
            {proposals.map((proposal) => (
              <li key={proposal.id} className="border-stone-deep flex flex-col gap-3 border-t pt-5">
                <span className="font-display text-xl">{proposal.subject}</span>
                <p className="text-taupe-deep max-w-160 text-sm leading-relaxed">
                  {proposal.reason}
                </p>
                {mayConfer ? (
                  <ThePalmaDecision
                    actionId={proposal.id}
                    subject={proposal.subject}
                    proposedBy={proposal.requestedByName}
                  />
                ) : (
                  <p className="text-taupe-deep text-xs">
                    Proposed by {proposal.requestedByName}. It is conferred when a second person
                    with the authority signs it off.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mayPropose ? (
        <section className="border-stone-deep mt-10 border p-7">
          <h2 className="font-display text-2xl">Propose</h2>

          {open.length === 0 ? (
            <Notice className="mt-5" tone="warning">
              Every season on record already holds THE PALMA. There is one a year.
            </Notice>
          ) : (
            <div className="mt-7 grid gap-12 lg:grid-cols-2">
              <ThePalmaForm seasons={open} creators={creators} />

              <div className="flex flex-col gap-8">
                <div>
                  <h3 className="palma-label text-taupe-deep">What the panel weighs</h3>
                  <ul className="mt-4 flex flex-col gap-2">
                    {CONSIDERATIONS.map((consideration) => (
                      <li key={consideration.key} className="text-sm leading-relaxed">
                        <span className="font-medium">{consideration.title}.</span>{' '}
                        <span className="text-taupe-deep">{consideration.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="palma-label text-taupe-deep">What it is not</h3>
                  <ul className="mt-4 flex flex-col gap-2">
                    {NOT_MEASURED.map((entry) => (
                      <li key={entry.term} className="text-sm leading-relaxed">
                        <span className="font-medium">{entry.term}.</span>{' '}
                        <span className="text-taupe-deep">{entry.why}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
