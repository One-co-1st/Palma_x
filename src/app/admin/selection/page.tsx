import { FinalistForm, WinnerForm } from '@/components/admin/AdminForms';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, THead } from '@/components/ui/table';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getAdminOverview, getCategoryStandings } from '@/server/data/admin';
import { MIN_JUDGES_PER_CANDIDACY } from '@/domain/selection';
import { titleCase } from '@/lib/utils';

export const metadata = buildMetadata({
  title: 'Finalists and winners',
  description: 'Confirm the PALMA record.',
  path: '/admin/selection',
  noIndex: true,
});

export default async function AdminSelectionPage() {
  await requirePermission('admin:select_finalists', '/admin/selection');
  const overview = await getAdminOverview();
  if (!overview) return <Notice tone="warning">No current season.</Notice>;

  const standings = await getCategoryStandings(overview.seasonYear);

  return (
    <>
      <h1 className="text-3xl">{overview.seasonTitle} standings</h1>
      <Notice className="mt-5" title="How this ranking is produced">
        Candidacies are ranked by trimmed mean. Once four or more judges have scored, the highest
        and lowest are removed. The ranking is a recommendation. Confirming it is the act that
        confers an honour, mints its verification record, and is written to the audit log.
      </Notice>

      {standings.length === 0 ? (
        <EmptyState className="mt-10" title="No categories to show" />
      ) : (
        <div className="mt-12 flex flex-col gap-14">
          {standings.map((standing) => {
            const hasFinalists = standing.candidates.some((c) => c.honour === 'finalist');
            const hasWinner = standing.candidates.some((c) => c.honour === 'winner');

            return (
              <section key={standing.categoryId} className="border-stone-deep border p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h3 className="font-display text-2xl">{standing.categoryName}</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    {hasWinner ? (
                      <Badge variant="champagne">PALMA conferred</Badge>
                    ) : hasFinalists ? (
                      <WinnerForm categoryId={standing.categoryId} />
                    ) : (
                      <FinalistForm categoryId={standing.categoryId} />
                    )}
                  </div>
                </div>

                {standing.candidates.length === 0 ? (
                  <p className="text-taupe-deep mt-6 text-sm">No scored nominations yet.</p>
                ) : (
                  <div className="mt-6">
                    <Table>
                      <THead>
                        <tr>
                          <th scope="col">Creator</th>
                          <th scope="col">Judges</th>
                          <th scope="col">Trimmed mean</th>
                          <th scope="col">Spread</th>
                          <th scope="col">Standing</th>
                        </tr>
                      </THead>
                      <TBody>
                        {standing.candidates.map((candidate) => (
                          <tr key={candidate.candidacyId}>
                            <td className="font-display text-lg">{candidate.creatorName}</td>
                            <td
                              className={
                                candidate.judgeCount < MIN_JUDGES_PER_CANDIDACY
                                  ? 'text-red-800'
                                  : 'text-taupe-deep'
                              }
                            >
                              {candidate.judgeCount}
                            </td>
                            <td className="tabular-nums">{candidate.trimmedMean.toFixed(2)}</td>
                            <td
                              className={
                                candidate.spread >= 20 ? 'text-red-800' : 'text-taupe-deep'
                              }
                            >
                              {candidate.spread}
                            </td>
                            <td>
                              {candidate.honour ? (
                                <Badge
                                  variant={candidate.honour === 'winner' ? 'champagne' : 'olive'}
                                >
                                  {titleCase(candidate.honour)}
                                </Badge>
                              ) : candidate.eligible ? (
                                <span className="palma-label text-taupe-deep">Eligible</span>
                              ) : (
                                <span className="palma-label text-red-800">Not eligible</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
