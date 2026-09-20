import Link from 'next/link';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { VerificationDecisionForm } from '@/components/operations/Forms';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { listVerificationCases } from '@/server/data/operations';
import { MEDIA_STAGE_LABEL, REASON_LABEL, mediaStage } from '@/domain/verification-case';
import { formatDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Verification',
  description: 'Manual age assurance cases.',
  path: '/portal/verification',
  noIndex: true,
});

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requirePermission('verification:review_manual', '/portal/verification');
  const { filter } = await searchParams;

  const cases = await listVerificationCases(filter === 'all' ? 'all' : 'open');

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Queue</span>
        <h1 className="text-4xl">Manual age verification</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Cases PALMA&rsquo;s assurance provider could not settle. You see only what the decision
          needs. What PALMA keeps afterwards is a status, a reference and a hash, never a document.
        </p>
      </div>

      <Notice tone="neutral" className="mt-8" title="The privacy lifecycle">
        Submission → restricted workspace → decision → result recorded → media deleted → audit
        event. A case cannot be closed while media is still held, so nothing is left sitting in a
        workspace with no prompt to remove it.
      </Notice>

      <nav
        aria-label="Verification filters"
        className="border-stone-deep mt-10 flex gap-6 border-b pb-4"
      >
        <Link href="/portal/verification" className="palma-label text-taupe-deep hover:text-ink">
          Open
        </Link>
        <Link
          href="/portal/verification?filter=all"
          className="palma-label text-taupe-deep hover:text-ink"
        >
          All
        </Link>
      </nav>

      {cases.length === 0 ? (
        <EmptyState
          className="mt-12"
          title="No cases"
          description="Every creator has been settled by the provider. Nothing needs a person."
        />
      ) : (
        <div className="mt-10 flex flex-col gap-10">
          {cases.map((entry) => {
            const stage = mediaStage({
              receivedAt: entry.mediaReceivedAt,
              deletedAt: entry.mediaDeletedAt,
            });

            return (
              <article key={entry.id} className="border-stone-deep border">
                <div className="border-stone-deep flex flex-wrap items-baseline justify-between gap-4 border-b p-6">
                  <div className="flex flex-col gap-1">
                    <span className="palma-label text-taupe font-mono">{entry.reference}</span>
                    <Link
                      href={`/portal/creators/${entry.creatorSlug}`}
                      className="palma-link font-display text-2xl"
                    >
                      {entry.creatorName}
                    </Link>
                  </div>
                  <Badge variant={entry.status === 'open' ? 'olive' : 'muted'}>
                    {titleCase(entry.status)}
                  </Badge>
                </div>

                <div className="grid gap-8 p-6 lg:grid-cols-12 lg:gap-10">
                  <dl className="flex flex-col gap-4 text-sm lg:col-span-5">
                    <div className="border-stone-deep/60 flex flex-col gap-1 border-b pb-3">
                      <dt className="palma-label text-taupe">Reason</dt>
                      <dd>{REASON_LABEL[entry.reason]}</dd>
                    </div>
                    <div className="border-stone-deep/60 flex flex-col gap-1 border-b pb-3">
                      <dt className="palma-label text-taupe">Opened</dt>
                      <dd>{formatDate(entry.openedAt)}</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="palma-label text-taupe">Submitted media</dt>
                      <dd
                        className={
                          stage === 'held'
                            ? 'text-champagne-deep'
                            : stage === 'deleted'
                              ? 'text-olive'
                              : 'text-taupe-deep'
                        }
                      >
                        {stage === 'deleted' ? '✓ ' : ''}
                        {MEDIA_STAGE_LABEL[stage]}
                      </dd>
                    </div>
                  </dl>

                  <div className="lg:col-span-7">
                    {entry.status === 'open' || entry.status === 'awaiting_information' ? (
                      <VerificationDecisionForm caseId={entry.id} mediaHeld={stage === 'held'} />
                    ) : (
                      <p className="text-taupe-deep text-sm">This case is closed.</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
