import Link from 'next/link';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { listClaims } from '@/server/data/operations';
import { formatDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Creator claims',
  description: 'Requests to control a PALMA creator record.',
  path: '/portal/claims',
  noIndex: true,
});

export default async function ClaimsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requirePermission('claims:review', '/portal/claims');
  const { filter } = await searchParams;

  const claims = await listClaims(filter === 'settled' ? 'settled' : 'open');
  const shown = filter === 'escalated' ? claims.filter((c) => c.status === 'escalated') : claims;

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Queue</span>
        <h1 className="text-4xl">Creator claims</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          A claim asks to control a record PALMA already holds. Approving links an account to the
          existing record. It never creates a second profile, and it never hands over the history.
        </p>
      </div>

      <nav aria-label="Claim filters" className="border-stone-deep mt-10 flex gap-6 border-b pb-4">
        {[
          ['/portal/claims', 'Open'],
          ['/portal/claims?filter=escalated', 'Escalated'],
          ['/portal/claims?filter=settled', 'Settled'],
        ].map(([href, label]) => (
          <Link key={href} href={href!} className="palma-label text-taupe-deep hover:text-ink">
            {label}
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <EmptyState
          className="mt-12"
          title="Nothing waiting"
          description="No claim in this view needs a decision."
        />
      ) : (
        <ul className="mt-4 flex flex-col">
          {shown.map((claim) => (
            <li key={claim.id}>
              <Link
                href={`/portal/claims/${claim.id}`}
                className="palma-row border-stone-deep grid gap-3 border-b py-6 sm:grid-cols-12 sm:items-baseline sm:gap-6"
              >
                <span className="palma-label text-taupe font-mono sm:col-span-2">
                  {claim.reference}
                </span>

                <span className="sm:col-span-4">
                  <span className="palma-row-lead font-display block text-xl">
                    {claim.creatorName}
                  </span>
                  <span className="text-taupe mt-1 block text-xs">
                    /creators/{claim.creatorSlug}
                  </span>
                </span>

                <span className="text-taupe-deep min-w-0 text-sm break-all sm:col-span-3">
                  {claim.claimantEmail}
                </span>

                <span className="text-taupe text-xs sm:col-span-2">
                  {formatDate(claim.createdAt)}
                </span>

                <span className="sm:col-span-1 sm:text-right">
                  <Badge
                    variant={
                      claim.status === 'escalated'
                        ? 'olive'
                        : claim.status === 'approved'
                          ? 'olive'
                          : 'muted'
                    }
                  >
                    {titleCase(claim.status)}
                  </Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Notice className="mt-14" title="What approval does">
        Links the claimant&rsquo;s User to the existing Creator record, marks it claimed, and raises
        the account to the creator role if it holds none. No duplicate record is created, and the
        public profile is the same profile it was before.
      </Notice>
    </>
  );
}
