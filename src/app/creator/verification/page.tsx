import { PortalShell } from '@/components/palma/PortalShell';
import { Badge } from '@/components/ui/badge';
import { Notice } from '@/components/ui/feedback';
import { VerificationForm } from '@/components/account/PortalForms';
import { buildMetadata } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { getCreatorPortal } from '@/server/data/portal';
import { formatShortDate } from '@/lib/format';
import { titleCase } from '@/lib/utils';
import { CREATOR_NAV } from '@/lib/creator-nav';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Verification',
  description: 'Age and identity assurance on your PALMA record.',
  path: '/creator/verification',
  noIndex: true,
});

export default async function CreatorVerificationPage() {
  const session = await requireSession('/creator/verification');
  const portal = await getCreatorPortal(session.user.id);
  const status = portal?.verification.status ?? 'unverified';

  return (
    <PortalShell
      title="PALMA Portal"
      subtitle="Verification"
      userName={session.user.email}
      nav={CREATOR_NAV}
      activeHref="/creator/verification"
    >
      <div className="flex max-w-160 flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl leading-tight">Age and identity assurance</h2>
          <Badge variant={status === 'verified' ? 'olive' : 'default'}>{titleCase(status)}</Badge>
        </div>

        <p className="text-taupe-deep leading-relaxed">
          PALMA confers nothing on an unverified record. Assurance is handled by a specialist
          provider, and PALMA keeps only the outcome, a reference and a date. No document, no date
          of birth, no identity number, and nothing a person could be re-identified from.
        </p>

        <VerificationForm status={status} />

        {portal?.verification.verifiedAt ? (
          <p className="text-taupe-deep text-sm">
            Verified {formatShortDate(portal.verification.verifiedAt)}
            {portal.verification.expiresAt
              ? ` · renews ${formatShortDate(portal.verification.expiresAt)}`
              : ''}
          </p>
        ) : null}

        <Notice title="Why this gate exists">
          Every creator PALMA honours is an adult, and the institution has to be able to say so
          without keeping a drawer full of identity documents. Verification is the whole of how it
          does that.
        </Notice>
      </div>
    </PortalShell>
  );
}
