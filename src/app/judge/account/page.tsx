import Link from 'next/link';
import { PortalShell } from '@/components/palma/PortalShell';
import { EmptyState, Notice } from '@/components/ui/feedback';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { getJudgeAccount } from '@/server/data/judging';
import { JUDGING_NAV } from '@/lib/judging-nav';
import { CONTACTS } from '@/lib/legal';
import { COUNTRIES } from '@/lib/countries';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Judge account',
  description: 'Your PALMA panel profile, security and confidentiality status.',
  path: '/judge/account',
  noIndex: true,
});

export default async function JudgeAccountPage() {
  const session = await requirePermission('judging:view_assignments', '/judge/account');
  const account = session.user.judgeId
    ? await getJudgeAccount(session.user.judgeId, session.user.id, session.sessionId ?? null)
    : null;

  if (!account) {
    return (
      <PortalShell title="PALMA Judging" userName={session.user.name}>
        <EmptyState
          title="No panel membership"
          description="This account is not currently seated on a PALMA panel."
        />
      </PortalShell>
    );
  }

  const country = account.countryCode
    ? (COUNTRIES.find((entry) => entry.code === account.countryCode)?.name ?? account.countryCode)
    : null;

  return (
    <PortalShell
      title="PALMA Judging"
      subtitle="Account"
      nav={JUDGING_NAV}
      activeHref="/judge/account"
      userName={account.displayName}
    >
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="flex flex-col gap-14 lg:col-span-7">
          <section>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">Profile</h2>
            <p className="text-taupe mt-4 text-xs leading-relaxed">
              This is what appears on{' '}
              <Link href="/about/judges" className="palma-link text-ink">
                the public panel page
              </Link>
              . Who sat on a panel is public; what any judge did is never published.
            </p>

            <dl className="mt-6 flex flex-col">
              {[
                ['Name', account.displayName],
                ['Title', account.title ?? '—'],
                ['Organisation', account.organisation ?? '—'],
                ['Based', country ?? '—'],
                ['Seated since', formatDate(account.seatedSince)],
                [
                  'Panels',
                  account.seasons.length > 0
                    ? account.seasons
                        .map((season) => `${season.year}${season.isChair ? ' (chair)' : ''}`)
                        .join(', ')
                    : '—',
                ],
              ].map(([term, value]) => (
                <div
                  key={term}
                  className="border-stone-deep/60 flex items-baseline justify-between gap-6 border-b py-3.5"
                >
                  <dt className="text-taupe-deep text-sm">{term}</dt>
                  <dd className="text-right text-sm">{value}</dd>
                </div>
              ))}
            </dl>

            {account.biography ? (
              <p className="text-taupe-deep mt-6 text-sm leading-relaxed">{account.biography}</p>
            ) : null}

            <p className="text-taupe mt-6 text-xs leading-relaxed">
              To change any of this, write to{' '}
              <a href={`mailto:${CONTACTS.general}`} className="palma-link text-ink">
                {CONTACTS.general}
              </a>
              . Panel profiles are edited by PALMA rather than self-served, so the public page and
              the record agree.
            </p>
          </section>

          <section>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              Security
            </h2>

            <dl className="mt-6 flex flex-col">
              {[
                ['Email', account.email],
                ['Email verified', account.emailVerified ? 'Yes' : 'No'],
                ['Last sign-in', account.lastLoginAt ? formatDate(account.lastLoginAt) : '—'],
                ['Password', 'Hashed with scrypt. PALMA cannot read it.'],
                ['Two-factor authentication', 'Not yet available. Planned before judging opens'],
              ].map(([term, value]) => (
                <div
                  key={term}
                  className="border-stone-deep/60 flex items-baseline justify-between gap-6 border-b py-3.5"
                >
                  <dt className="text-taupe-deep text-sm">{term}</dt>
                  <dd className="text-right text-sm break-all">{value}</dd>
                </div>
              ))}
            </dl>

            <h3 className="palma-label text-taupe mt-10 mb-3">Active sessions</h3>
            <ul className="flex flex-col">
              {account.sessions.map((item) => (
                <li
                  key={item.id}
                  className="border-stone-deep/60 flex flex-wrap items-baseline justify-between gap-3 border-b py-3.5 text-sm last:border-none"
                >
                  <span className="text-taupe-deep min-w-0 break-all">
                    {item.userAgent ?? 'Unrecorded device'}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-4">
                    <span className="text-taupe text-xs">since {formatDate(item.createdAt)}</span>
                    {item.isCurrent ? (
                      <span className="palma-label text-olive">This device</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-taupe mt-4 text-xs leading-relaxed">
              Signing out ends the session on this device. To end every other session, write to{' '}
              <a href={`mailto:${CONTACTS.security}`} className="palma-link text-ink">
                {CONTACTS.security}
              </a>
              .
            </p>
          </section>
        </div>

        <aside className="flex flex-col gap-10 lg:col-span-5">
          <div className="border-stone-deep border p-7">
            <h2 className="palma-label text-taupe-deep mb-5">Confidentiality</h2>
            <ul className="text-taupe-deep flex flex-col gap-3 text-sm leading-relaxed">
              <li>
                Scores, rationales and deliberations are confidential permanently. They are not
                disclosed to nominees, sponsors, the press or the public.
              </li>
              <li>
                You may not discuss a candidacy outside the panel, or indicate an outcome before
                PALMA announces it.
              </li>
              <li>
                You may not accept anything of value from a nominee, or from anyone acting for one,
                during a season in which you sit.
              </li>
              <li>Declare a conflict the moment you recognise one. The chair decides, not you.</li>
              <li>
                A submitted assessment is immutable. Corrections are an administrative act with
                their own audit record.
              </li>
            </ul>

            <dl className="border-stone-deep mt-6 flex flex-col gap-3 border-t pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">Judge agreement</dt>
                <dd className="text-olive palma-label">Accepted on appointment</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">Confidentiality</dt>
                <dd className="text-olive palma-label">In force</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-3">
              PALMA policies
            </h2>
            <ul className="mt-4 flex flex-col">
              {[
                ['/about/judging', 'How judging works'],
                ['/legal/rules', 'Competition rules'],
                ['/about/policy', 'Content policy'],
                ['/legal/privacy', 'Privacy notice'],
                ['/legal/complaints', 'Complaints and appeals'],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href!}
                    className="palma-row border-stone-deep/60 hover:text-ink text-taupe-deep flex items-baseline justify-between gap-4 border-b py-3 text-sm last:border-none"
                  >
                    <span className="palma-row-lead">{label}</span>
                    <span aria-hidden="true" className="text-taupe shrink-0">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Notice title="What PALMA writes to you about">
            New assignments, reassignments, conflict decisions, deadline reminders, judging opening
            and closing, and administrative announcements. Nothing else. There is no feed here to
            subscribe to.
          </Notice>
        </aside>
      </div>
    </PortalShell>
  );
}
