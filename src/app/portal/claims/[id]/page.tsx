import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, Check, ExternalLink } from 'lucide-react';
import { Notice } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { ClaimDecisionForm } from '@/components/operations/Forms';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { getClaimCase } from '@/server/data/operations';
import { approvalIsBlocked, INSTITUTIONAL_FIELDS, isOpenClaim } from '@/domain/claim';
import type { ClaimStatus } from '@/domain/claim';
import { countryName, formatDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Claim review',
  description: 'Review a creator claim.',
  path: '/portal/claims',
  noIndex: true,
});

export default async function ClaimCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('claims:review', `/portal/claims/${id}`);

  const claim = await getClaimCase(id);
  if (!claim) notFound();

  const blocked = approvalIsBlocked({
    recordUnclaimed: claim.checks.find((c) => c.key === 'record_unclaimed')?.state === 'passed',
    verificationComplete: claim.record.verificationStatus === 'verified',
    identityStatementSupplied: claim.claimant.claimedIdentity.length > 0,
    evidenceLinkCount: claim.claimant.links.length,
    invited: claim.invited,
    openReports: claim.openReports,
  });

  const open = isOpenClaim(claim.status as ClaimStatus);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <Link href="/portal/claims" className="palma-label text-taupe-deep hover:text-ink">
          ← Claims
        </Link>
        <span className="palma-label text-taupe font-mono">{claim.reference}</span>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Claim review case</span>
        <h1 className="text-4xl">{claim.record.displayName}</h1>
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant={open ? 'olive' : 'muted'}>{titleCase(claim.status)}</Badge>
          <span className="text-taupe text-sm">Received {formatDate(claim.createdAt)}</span>
          <Link
            href={`/creators/${claim.record.slug}`}
            className="palma-link text-taupe-deep text-sm"
          >
            View the public record
          </Link>
        </div>
      </div>

      <div className="mt-12 grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="flex min-w-0 flex-col gap-12 lg:col-span-7">
          {/* The record as it stands. Read-only here, permanently. */}
          <section>
            <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Existing PALMA record
            </h3>

            <dl className="mt-6 flex flex-col">
              {[
                ['Name', claim.record.displayName],
                ['Country', countryName(claim.record.countryCode)],
                ['City', claim.record.city ?? '—'],
                ['Headline', claim.record.headline ?? '—'],
                ['Record created', formatDate(claim.record.createdAt)],
                ['Published', claim.record.isPublished ? 'Yes' : 'No'],
                [
                  'Verification',
                  claim.record.verifiedAt
                    ? `${titleCase(claim.record.verificationStatus)} · ${formatDate(claim.record.verifiedAt)}`
                    : titleCase(claim.record.verificationStatus),
                ],
              ].map(([term, value]) => (
                <div
                  key={term}
                  className="border-stone-deep/60 flex items-baseline justify-between gap-6 border-b py-3"
                >
                  <dt className="text-taupe-deep text-sm">{term}</dt>
                  <dd className="text-right text-sm">{value}</dd>
                </div>
              ))}
            </dl>

            {claim.record.biography ? (
              <p className="text-taupe-deep mt-6 text-sm leading-relaxed">
                {claim.record.biography}
              </p>
            ) : null}

            {claim.record.honours.length > 0 ? (
              <div className="mt-8">
                <h4 className="palma-label text-taupe mb-3">PALMA achievements on this record</h4>
                <ul className="flex flex-col">
                  {claim.record.honours.map((honour, index) => (
                    <li
                      key={`${honour.year}-${honour.categoryName}-${index}`}
                      className="border-stone-deep/50 flex items-baseline justify-between gap-4 border-b py-2.5 text-sm last:border-none"
                    >
                      <span className="font-display text-base">
                        {honour.year} · {titleCase(honour.kind)}
                      </span>
                      <span className="text-taupe-deep">{honour.categoryName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-taupe mt-8 text-sm">No honours on this record yet.</p>
            )}

            {claim.record.links.length > 0 ? (
              <div className="mt-8">
                <h4 className="palma-label text-taupe mb-3">Existing public links</h4>
                <ul className="flex flex-col gap-2">
                  {claim.record.links.map((link) => (
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

          {/* What the claimant supplied. Never published. */}
          <section>
            <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Claimant information
            </h3>
            <p className="text-taupe mt-3 text-xs leading-relaxed">
              Supplied to establish control of the identity. None of it becomes the public record.
            </p>

            <dl className="mt-6 flex flex-col">
              {[
                ['Account', claim.claimant.email],
                ['Name on account', claim.claimant.name],
                ['Current role', titleCase(claim.claimant.role)],
                ['Contact email', claim.claimant.contactEmail],
                ['Arrived via invitation', claim.invited ? 'Yes' : 'No'],
              ].map(([term, value]) => (
                <div
                  key={term}
                  className="border-stone-deep/60 flex items-baseline justify-between gap-6 border-b py-3"
                >
                  <dt className="text-taupe-deep text-sm">{term}</dt>
                  <dd className="text-right text-sm break-all">{value}</dd>
                </div>
              ))}
            </dl>

            <h4 className="palma-label text-taupe mt-8 mb-3">Stated identity</h4>
            <p className="border-olive/40 text-ink/85 border-l-2 pl-5 text-sm leading-relaxed whitespace-pre-line">
              {claim.claimant.claimedIdentity}
            </p>

            {claim.claimant.supportingNote ? (
              <>
                <h4 className="palma-label text-taupe mt-8 mb-3">Supporting note</h4>
                <p className="text-taupe-deep text-sm leading-relaxed whitespace-pre-line">
                  {claim.claimant.supportingNote}
                </p>
              </>
            ) : null}

            {claim.claimant.links.length > 0 ? (
              <div className="mt-8">
                <h4 className="palma-label text-taupe mb-3">Evidence of control</h4>
                <ul className="flex flex-col gap-2">
                  {claim.claimant.links.map((link) => (
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
        </div>

        <div className="min-w-0 lg:col-span-5">
          <div className="flex flex-col gap-10 lg:sticky lg:top-10">
            <section>
              <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
                Does this establish control?
              </h3>

              <ul className="mt-2 flex flex-col">
                {claim.checks.map((check) => (
                  <li
                    key={check.key}
                    className="border-stone-deep/50 flex gap-3 border-b py-3.5 last:border-none"
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
                  </li>
                ))}
              </ul>
            </section>

            {open ? (
              <section>
                <h3 className="palma-label text-taupe-deep border-stone-deep mb-6 border-b pb-3">
                  Decision
                </h3>
                <ClaimDecisionForm
                  claimId={claim.id}
                  blocked={blocked}
                  canDecide={can(session.user.role, 'claims:decide')}
                />
              </section>
            ) : (
              <Notice tone="neutral" title={`Settled, ${titleCase(claim.status)}`}>
                {claim.decidedByEmail ? `Decided by ${claim.decidedByEmail}` : 'Decided'}
                {claim.decidedAt ? ` on ${formatDate(claim.decidedAt)}` : ''}.
                {claim.decisionNote ? ` ${claim.decisionNote}` : ''}
              </Notice>
            )}

            {claim.informationRequestedNote ? (
              <Notice tone="warning" title="Information requested">
                {claim.informationRequestedNote}
              </Notice>
            ) : null}

            <div className="border-stone-deep border p-6">
              <h3 className="palma-label text-taupe-deep mb-4">What approval never grants</h3>
              <p className="text-taupe-deep text-sm leading-relaxed">
                A claimant who is approved controls how they are presented. PALMA&rsquo;s record of
                what happened stays PALMA&rsquo;s, permanently:
              </p>
              <ul className="text-taupe mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {INSTITUTIONAL_FIELDS.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
