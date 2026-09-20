import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Notice } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import {
  CreatorRecordForm,
  InternalNoteForm,
  InvitationForm,
  OpenVerificationCaseForm,
} from '@/components/operations/Forms';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { getCreatorRecord } from '@/server/data/operations';
import { INSTITUTIONAL_FIELDS } from '@/domain/claim';
import { formatDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Creator record',
  description: 'Maintain a PALMA creator record.',
  path: '/portal/creators',
  noIndex: true,
});

export default async function CreatorRecordPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requirePermission('creators:view_records', `/portal/creators/${slug}`);

  const record = await getCreatorRecord(slug);
  if (!record) notFound();

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <Link href="/portal/creators" className="palma-label text-taupe-deep hover:text-ink">
          ← Creator records
        </Link>
        <Link href={`/creators/${record.slug}`} className="palma-link text-taupe-deep text-sm">
          View the public record
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Creator record</span>
        <h1 className="text-4xl">{record.displayName}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={record.heldBy ? 'olive' : 'muted'}>
            {record.heldBy ? 'Claimed' : 'Unclaimed'}
          </Badge>
          <Badge variant="muted">{titleCase(record.verification.status)}</Badge>
          {record.isPublished ? null : <Badge variant="muted">Unpublished</Badge>}
          {record.heldBy ? (
            <span className="text-taupe text-sm break-all">held by {record.heldBy.email}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-12 grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="flex min-w-0 flex-col gap-14 lg:col-span-7">
          <section>
            <h3 className="palma-label text-taupe-deep border-stone-deep mb-6 border-b pb-3">
              Public information
            </h3>
            {can(session.user.role, 'editorial:edit_creator') ? (
              <CreatorRecordForm
                creator={{
                  id: record.id,
                  displayName: record.displayName,
                  countryCode: record.countryCode,
                  city: record.city,
                  headline: record.headline,
                  biography: record.biography,
                  websiteUrl: record.websiteUrl,
                  isPublished: record.isPublished,
                }}
              />
            ) : (
              <>
                <dl className="flex flex-col">
                  {(
                    [
                      ['Headline', record.headline ?? '—'],
                      ['City', record.city ?? '—'],
                      ['Website', record.websiteUrl ?? '—'],
                      ['Published', record.isPublished ? 'Yes' : 'No'],
                    ] as const
                  ).map(([term, value]) => (
                    <div
                      key={term}
                      className="border-stone-deep/60 flex items-baseline justify-between gap-6 border-b py-3"
                    >
                      <dt className="text-taupe-deep text-sm">{term}</dt>
                      <dd className="text-right text-sm break-all">{value}</dd>
                    </div>
                  ))}
                </dl>
                {record.biography ? (
                  <p className="text-taupe-deep mt-6 text-sm leading-relaxed">{record.biography}</p>
                ) : null}
                <p className="text-taupe mt-6 text-xs leading-relaxed">
                  Read-only for your role. Editing a creator&rsquo;s presentation is editorial work.
                </p>
              </>
            )}
          </section>

          {/* Where the work lives. The desk writes the record from these, so
              they belong beside the copy rather than in the database. */}
          <section>
            <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Where the work lives
            </h3>
            <p className="text-taupe mt-3 text-xs leading-relaxed">
              Supplied by the creator. Open each one before publishing: a record PALMA has not
              checked against the work is a record PALMA cannot stand behind.
            </p>
            {record.links.length === 0 ? (
              <p className="text-taupe mt-6 text-sm">
                No links on this record. Ask for them before publishing it.
              </p>
            ) : (
              <ul className="mt-6 flex flex-col">
                {record.links.map((link) => (
                  <li
                    key={link.id}
                    className="border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3 text-sm last:border-none"
                  >
                    <span className="palma-label text-taupe-deep">{link.label}</span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="palma-link min-w-0 break-all"
                    >
                      {link.url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* The institutional record. Displayed, never editable from here. */}
          <section>
            <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              PALMA record
            </h3>
            <p className="text-taupe mt-3 text-xs leading-relaxed">
              What happened. Not editable from the back office, and not editable by the creator
              after they claim the profile: {INSTITUTIONAL_FIELDS.slice(0, 6).join(', ')} and the
              rest of the institutional record. Outcomes change only through selection, revocation
              or a correction by an administrator, each with its own audit trail.
            </p>

            {record.honours.length === 0 ? (
              <p className="text-taupe mt-6 text-sm">No honours on this record.</p>
            ) : (
              <ul className="mt-6 flex flex-col">
                {record.honours.map((honour, index) => (
                  <li
                    key={`${honour.year}-${honour.categoryName}-${index}`}
                    className="border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-3 border-b py-3 text-sm last:border-none"
                  >
                    <span className="font-display text-base">
                      {honour.year} · {titleCase(honour.kind)}
                    </span>
                    <span className="text-taupe-deep">{honour.categoryName}</span>
                    <Badge variant={honour.state === 'active' ? 'olive' : 'muted'}>
                      {titleCase(honour.state)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Internal notes
            </h3>
            <p className="text-taupe mt-3 text-xs leading-relaxed">
              Staff only. Never published, never shown to the creator, and structurally apart from
              anything that is.
            </p>

            {can(session.user.role, 'editorial:write_internal_note') ? (
              <div className="mt-6">
                <InternalNoteForm creatorId={record.id} />
              </div>
            ) : null}

            {record.notes.length === 0 ? (
              <p className="text-taupe mt-6 text-sm">No internal notes.</p>
            ) : (
              <ul className="mt-8 flex flex-col gap-5">
                {record.notes.map((note) => (
                  <li key={note.id} className="border-stone-deep/60 border-l-2 pl-4">
                    <p className="text-ink/85 text-sm leading-relaxed whitespace-pre-line">
                      {note.body}
                    </p>
                    <p className="text-taupe mt-2 text-xs">
                      {note.author ?? 'PALMA'} · {formatDate(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-10 lg:col-span-5">
          <section className="border-stone-deep border p-6">
            <h3 className="palma-label text-taupe-deep mb-4">Claim status</h3>

            {record.heldBy ? (
              <p className="text-taupe-deep text-sm leading-relaxed">
                Held by <span className="text-ink break-all">{record.heldBy.email}</span>. The
                public profile is unchanged by that. Claiming changes who may edit the presentation,
                nothing else.
              </p>
            ) : (
              <>
                <p className="text-taupe-deep text-sm leading-relaxed">
                  Unclaimed. Invite the creator to claim it: the link is single-use, expires in 30
                  days, and is stored only as a hash.
                </p>
                {can(session.user.role, 'editorial:edit_creator') ? (
                  <div className="mt-5">
                    <InvitationForm creatorId={record.id} />
                  </div>
                ) : null}
              </>
            )}

            {record.invitations.length > 0 ? (
              <ul className="border-stone-deep mt-6 flex flex-col gap-2 border-t pt-4 text-xs">
                {record.invitations.map((invitation) => (
                  <li key={invitation.id} className="text-taupe flex justify-between gap-4">
                    <span>Issued {formatDate(invitation.createdAt)}</span>
                    <span>
                      {invitation.usedAt
                        ? `Used ${formatDate(invitation.usedAt)}`
                        : `Expires ${formatDate(invitation.expiresAt)}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {record.claims.length > 0 ? (
            <section>
              <h3 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
                Claims on this record
              </h3>
              <ul className="mt-2 flex flex-col">
                {record.claims.map((claim) => (
                  <li key={claim.id}>
                    <Link
                      href={`/portal/claims/${claim.id}`}
                      className="palma-row border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-3 border-b py-3 text-sm last:border-none"
                    >
                      <span className="palma-row-lead font-mono text-xs">{claim.reference}</span>
                      <span className="text-taupe-deep min-w-0 break-all">{claim.email}</span>
                      <span className="palma-label text-taupe">{titleCase(claim.status)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="border-stone-deep border p-6">
            <h3 className="palma-label text-taupe-deep mb-4">Verification</h3>
            <dl className="flex flex-col gap-3 text-sm">
              {[
                ['Status', titleCase(record.verification.status)],
                ['Provider', record.verification.provider ?? '—'],
                [
                  'Provider reference',
                  record.verification.providerReference
                    ? `${record.verification.providerReference.slice(0, 6)}…`
                    : '—',
                ],
                [
                  'Verified',
                  record.verification.verifiedAt ? formatDate(record.verification.verifiedAt) : '—',
                ],
              ].map(([term, value]) => (
                <div key={term} className="flex justify-between gap-4">
                  <dt className="text-taupe">{term}</dt>
                  <dd className="text-right break-all">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="text-taupe mt-5 text-xs leading-relaxed">
              PALMA holds no identity documents. This is the whole of what it keeps.
            </p>

            {can(session.user.role, 'verification:review_manual') ? (
              <div className="border-stone-deep mt-6 border-t pt-5">
                <OpenVerificationCaseForm creatorId={record.id} />
              </div>
            ) : null}

            {record.cases.length > 0 ? (
              <ul className="border-stone-deep mt-6 flex flex-col gap-2 border-t pt-4 text-xs">
                {record.cases.map((entry) => (
                  <li key={entry.id} className="text-taupe flex justify-between gap-4">
                    <span className="font-mono">{entry.reference}</span>
                    <span>{titleCase(entry.status)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {!can(session.user.role, 'admin:revoke_honour') ? (
            <Notice title="Outside your role">
              Selection, revocation and score correction are administrator actions. Editorial
              maintains the accuracy of the record and never its results.
            </Notice>
          ) : null}
        </div>
      </div>
    </>
  );
}
