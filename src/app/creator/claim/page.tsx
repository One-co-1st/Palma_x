import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { ClaimRequestForm } from '@/components/account/ClaimRequestForm';
import { Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requireSession } from '@/lib/auth/guards';
import { sql } from '@/server/db/sql';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Claim a profile',
  description: 'Ask to control your PALMA creator record.',
  path: '/creator/claim',
  noIndex: true,
});

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ creator?: string; token?: string }>;
}) {
  const session = await requireSession('/creator/claim');
  const { creator, token } = await searchParams;

  const recordRows = creator
    ? await sql<{ slug: string; displayName: string; userId: string | null }[]>`
        SELECT "slug", "displayName", "userId"
        FROM "Creator"
        WHERE "slug" = ${creator}
        LIMIT 1
      `
    : [];
  const record = recordRows[0] ?? null;

  const openClaimRows = await sql<
    {
      reference: string;
      createdAt: string;
      informationRequestedNote: string | null;
      creatorDisplayName: string;
      creatorSlug: string;
    }[]
  >`
    SELECT
      cc."reference",
      to_char(cc."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
      cc."informationRequestedNote",
      c."displayName" AS "creatorDisplayName",
      c."slug" AS "creatorSlug"
    FROM "CreatorClaim" cc
    JOIN "Creator" c ON c."id" = cc."creatorId"
    WHERE cc."userId" = ${session.user.id}
      AND cc."status" IN ('submitted', 'awaiting_information', 'escalated')
    ORDER BY cc."createdAt" DESC
    LIMIT 1
  `;
  const openClaim = openClaimRows[0] ?? null;

  return (
    <PortalShell title="PALMA Portal" subtitle="Claim a profile" userName={session.user.email}>
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="max-w-160 lg:col-span-7">
          <p className="text-taupe-deep mb-8 leading-relaxed">
            A PALMA record exists before anyone claims it, PALMA writes one the first time a creator
            is nominated. Claiming asks to control that existing record. It never creates a second
            profile, and approval is what links it to your account.
          </p>

          {openClaim ? (
            <Notice tone="ceremonial" title={`Claim ${openClaim.reference} is open`}>
              You have a claim open on {openClaim.creatorDisplayName}, submitted{' '}
              {openClaim.createdAt.slice(0, 10)}. PALMA reviews claims by hand and
              will write to you.
              {openClaim.informationRequestedNote ? (
                <span className="mt-3 block text-sm">
                  <strong>PALMA has asked for more:</strong> {openClaim.informationRequestedNote}
                </span>
              ) : null}
            </Notice>
          ) : record?.userId ? (
            <Notice tone="warning" title="Already held">
              That record is already held by an account. Write to PALMA if you believe that is
              wrong.
            </Notice>
          ) : (
            <ClaimRequestForm
              creatorSlug={record?.slug ?? creator}
              creatorName={record?.displayName}
              token={token}
            />
          )}
        </div>

        <aside className="lg:col-span-5">
          <div className="border-stone-deep border p-7">
            <h2 className="palma-label text-taupe-deep mb-4">What claiming gives you</h2>
            <ul className="text-taupe-deep flex flex-col gap-3 text-sm leading-relaxed">
              <li>Editing how you are described: biography, headline, links, portrait.</li>
              <li>Your nomination referral link, once you are verified.</li>
              <li>Your verification status and account settings.</li>
            </ul>

            <h2 className="palma-label text-taupe-deep mt-8 mb-4">What it never gives you</h2>
            <ul className="text-taupe-deep flex flex-col gap-3 text-sm leading-relaxed">
              <li>Editing nominations, finalist or winner status, or judging results.</li>
              <li>Removing an honour, a citation or a PaROH entry.</li>
              <li>Changing award dates or anything in the audit log.</li>
            </ul>

            <p className="text-taupe mt-6 text-xs leading-relaxed">
              You control how you are presented. PALMA controls the record of what happened. See{' '}
              <Link href="/legal/complaints" className="palma-link text-ink">
                complaints and appeals
              </Link>{' '}
              if you believe the record itself is wrong.
            </p>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
