import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, ExternalLink, AlertTriangle } from 'lucide-react';
import { PortalShell } from '@/components/palma/PortalShell';
import { JudgingRoom } from '@/components/judging/JudgingRoom';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getJudgingCase } from '@/server/data/judging';
import { JUDGING_NAV } from '@/lib/judging-nav';
import { countryName, formatDate } from '@/lib/format';
import { titleCase, cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Judging',
  description: 'Assess a PALMA candidate.',
  path: '/judge',
  noIndex: true,
});

type Params = { params: Promise<{ assignmentId: string }> };

export default async function JudgingRoomPage({ params }: Params) {
  const { assignmentId } = await params;
  const session = await requirePermission('judging:submit_score', `/judge/${assignmentId}`);
  if (!session.user.judgeId) notFound();

  const file = await getJudgingCase(assignmentId, session.user.judgeId);
  if (!file) notFound();

  const { candidate } = file;

  return (
    <PortalShell
      title="PALMA Judging"
      subtitle={candidate.name}
      nav={JUDGING_NAV}
      activeHref="/judge/assignments"
      userName={session.user.name}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <Link href="/judge/assignments" className="palma-label text-taupe-deep hover:text-ink">
          ← My judging
        </Link>
        <span className="palma-label text-taupe">
          PALMA {file.year} · {file.category.name} · {file.reference}
        </span>
      </div>

      <div className="mt-10 grid gap-14 lg:grid-cols-12 lg:gap-16">
        {/* The prepared case. PALMA answers the questions before the judge asks. */}
        <div className="flex min-w-0 flex-col gap-12 lg:col-span-7">
          <header className="flex flex-col gap-4">
            <span className="palma-label text-champagne-deep">{file.category.name}</span>
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">{candidate.name}</h2>
            <div className="text-taupe-deep flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {candidate.isVerified ? (
                <span className="text-olive palma-label inline-flex items-center gap-1.5">
                  <Check className="size-3.5" aria-hidden="true" /> Verified creator
                </span>
              ) : (
                <span className="palma-label text-taupe">Verification incomplete</span>
              )}
              <span>{countryName(candidate.country)}</span>
              {candidate.city ? <span>{candidate.city}</span> : null}
              {candidate.pronouns ? <span>{candidate.pronouns}</span> : null}
            </div>
            {candidate.headline ? (
              <p className="text-ink/85 font-display text-xl leading-snug">{candidate.headline}</p>
            ) : null}
          </header>

          <section>
            <div className="border-stone-deep flex flex-wrap items-baseline justify-between gap-4 border-b pb-3">
              <h3 className="palma-label text-taupe-deep">PALMA verified</h3>
              <span
                className={cn('palma-label', file.isClear ? 'text-olive' : 'text-champagne-deep')}
              >
                {file.isClear ? 'Case clear' : 'See the chair'}
              </span>
            </div>

            <ul className="mt-2 flex flex-col">
              {file.eligibility.map((check) => (
                <li
                  key={check.key}
                  className="border-stone-deep/50 flex gap-4 border-b py-3.5 last:border-none"
                >
                  {check.state === 'passed' ? (
                    <Check className="text-olive mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle
                      className="text-champagne-deep mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm">{check.label}</span>
                    <span className="text-taupe text-xs leading-relaxed">{check.detail}</span>
                  </span>
                  <span className="sr-only">
                    {check.state === 'passed' ? 'Passed' : 'Needs attention'}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-taupe mt-5 text-xs leading-relaxed">
              {file.screenedAt
                ? `Eligibility verified by PALMA’s screening team on ${formatDate(file.screenedAt)}.`
                : 'Screening sign-off is not yet logged against this candidacy.'}{' '}
              You are not expected to perform this work yourself.
            </p>
            {file.screeningNote ? (
              <p className="border-olive/40 text-ink/85 mt-4 border-l-2 pl-4 text-sm leading-relaxed">
                {file.screeningNote}
              </p>
            ) : null}
          </section>

          {file.audienceVoices.length > 0 ? (
            <section>
              <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
                Why they were nominated
              </h3>
              <ul className="mt-6 flex flex-col gap-5">
                {file.audienceVoices.map((voice, index) => (
                  <li
                    key={index}
                    className="border-stone-deep text-ink/85 border-l-2 pl-5 text-sm leading-relaxed"
                  >
                    &ldquo;{voice}&rdquo;
                  </li>
                ))}
              </ul>
              <p className="text-taupe mt-5 text-xs leading-relaxed">
                A sample of what the audience said. PALMA does not tell you how many people
                nominated this creator, and does not want you to weigh it: popularity brings a
                creator to our attention and stops there.
              </p>
            </section>
          ) : null}

          <section>
            <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Candidate record
            </h3>

            {candidate.biography ? (
              <p className="text-taupe-deep mt-6 text-sm leading-relaxed">{candidate.biography}</p>
            ) : null}

            {candidate.palmaRecord.length > 0 ? (
              <div className="mt-8">
                <h4 className="palma-label text-taupe mb-3">Previous PALMA recognition</h4>
                <ul className="flex flex-col">
                  {candidate.palmaRecord.map((entry, index) => (
                    <li
                      key={`${entry.year}-${entry.categoryName}-${index}`}
                      className="border-stone-deep/50 flex flex-wrap items-baseline justify-between gap-3 border-b py-3 text-sm last:border-none"
                    >
                      <span className="font-display text-base">
                        {entry.year} · {titleCase(entry.kind)}
                      </span>
                      <span className="text-taupe-deep">{entry.categoryName}</span>
                      {entry.code ? (
                        <span className="text-taupe font-mono text-xs tracking-wider">
                          {entry.code}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-taupe mt-8 text-sm">No previous PALMA recognition on record.</p>
            )}

            {candidate.links.length > 0 ? (
              <div className="mt-8">
                <h4 className="palma-label text-taupe mb-3">Public professional links</h4>
                <ul className="flex flex-col gap-2">
                  {candidate.links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="palma-link text-taupe-deep hover:text-ink inline-flex items-center gap-2 text-sm break-all"
                      >
                        {link.label}
                        <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section>
            <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Supporting material
            </h3>
            <p className="text-taupe mt-4 text-xs leading-relaxed">
              Gathered by PALMA, not demanded of the audience. Evidence opens on the platform where
              the work lives; PALMA hosts none of it, and none of it is public.
            </p>

            {file.evidence.length === 0 ? (
              <p className="text-taupe mt-6 text-sm">No supporting material recorded.</p>
            ) : (
              <ul className="mt-6 flex flex-col gap-3">
                {file.evidence.map((item) => (
                  <li key={item.id} className="border-stone-deep border p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="font-display text-lg">{item.label}</span>
                      <span className="palma-label text-taupe">{titleCase(item.kind)}</span>
                    </div>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-olive palma-link mt-2 inline-flex items-center gap-2 text-sm break-all"
                      >
                        {item.url}
                        <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    ) : null}
                    {item.note ? (
                      <p className="text-taupe-deep mt-2 text-sm leading-relaxed">{item.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-stone-deep flex flex-col gap-3 border-t pt-8">
            <h3 className="palma-label text-taupe-deep">Category eligibility</h3>
            <p className="text-taupe-deep text-sm leading-relaxed">{file.category.eligibility}</p>
            <h3 className="palma-label text-taupe-deep mt-4">What this category rewards</h3>
            <p className="text-taupe-deep text-sm leading-relaxed">{file.category.criteria}</p>
          </section>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <div className="lg:sticky lg:top-10">
            {!file.isClear ? (
              <Notice tone="warning" title="Eligibility is not settled" className="mb-8">
                One or more checks on this case need attention. You may still assess it, but raise
                the flagged check with the chair before you submit.
              </Notice>
            ) : null}

            <JudgingRoom
              assignmentId={file.assignmentId}
              candidacyId={file.candidacyId}
              candidateName={candidate.name}
              alreadyScored={file.alreadyScored}
              conflictDeclared={file.conflictDeclared}
              inProgress={file.status === 'in_progress'}
            />
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
