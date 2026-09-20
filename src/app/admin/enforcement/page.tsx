import { Badge } from '@/components/ui/badge';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { DecideActionForm, ProposeActionForm } from '@/components/admin/PeopleForms';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { listConsequentialActions, listEnforcement } from '@/server/data/people';
import { formatDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Enforcement',
  description: 'PALMA enforcement.',
  path: '/admin/enforcement',
  noIndex: true,
});

export default async function EnforcementPage() {
  const session = await requirePermission('admin:enforce', '/admin/enforcement');
  const [pending, history] = await Promise.all([
    listConsequentialActions('pending'),
    listEnforcement(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Operations</span>
        <h1 className="text-4xl">Enforcement</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          A permanent ban and the revocation of an honour are the two things PALMA cannot take back
          cleanly, so neither is one person&rsquo;s decision made at speed. One administrator
          proposes with a reason; a different one carries it out. Both names stay on the record.
        </p>
      </div>

      <div className="mt-12 grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="flex min-w-0 flex-col gap-14 lg:col-span-7">
          <section>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Awaiting a second administrator
            </h2>

            {pending.length === 0 ? (
              <EmptyState
                className="mt-8"
                title="Nothing pending"
                description="No irreversible action is waiting on approval."
              />
            ) : (
              <ul className="mt-6 flex flex-col gap-6">
                {pending.map((entry) => (
                  <li key={entry.id} className="border-stone-deep border p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="font-display text-xl">{entry.subject}</span>
                      <Badge variant="olive">{titleCase(entry.kind)}</Badge>
                    </div>

                    <p className="border-olive/40 text-ink/85 mt-4 border-l-2 pl-4 text-sm leading-relaxed">
                      {entry.reason}
                    </p>

                    <p className="text-taupe mt-4 text-xs">
                      Proposed by {entry.requestedBy} on {formatDate(entry.requestedAt)}
                      {entry.requestedBy === session.user.email
                        ? ' (you). Somebody else has to approve it.'
                        : ''}
                    </p>

                    <div className="border-stone-deep mt-5 border-t pt-5">
                      <DecideActionForm actionId={entry.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Enforcement history
            </h2>

            {history.length === 0 ? (
              <p className="text-taupe mt-6 text-sm">No enforcement action has ever been taken.</p>
            ) : (
              <ul className="mt-2 flex flex-col">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-stone-deep/60 flex flex-col gap-1.5 border-b py-4 last:border-none"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="font-display text-lg">{titleCase(entry.kind)}</span>
                      <span className="text-taupe text-xs">{formatDate(entry.createdAt)}</span>
                    </div>
                    <span className="text-taupe-deep text-sm leading-relaxed">
                      {entry.rationale}
                    </span>
                    <span className="text-taupe font-mono text-xs break-all">
                      {entry.entityType} {entry.entityId} · {entry.actor}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <div className="lg:sticky lg:top-10">
            <section className="border-stone-deep border p-6">
              <h2 className="palma-label text-taupe-deep mb-5">Propose an irreversible action</h2>
              <ProposeActionForm />
            </section>

            <Notice tone="warning" className="mt-8" title="A revoked honour is not deleted">
              Revocation marks the entry revoked and leaves it in the Roll of Honour with its date.
              Removing it entirely would make the archive a worse record of what happened, and the
              verification code would stop resolving rather than resolve to the truth.
            </Notice>
          </div>
        </div>
      </div>
    </>
  );
}
