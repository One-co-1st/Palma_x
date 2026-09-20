import { Suspense } from 'react';
import Link from 'next/link';
import { Notice } from '@/components/ui/feedback';
import { StatGrid } from '@/components/admin/StatGrid';
import { StatGridSkeleton } from '@/components/admin/Skeletons';
import { PeriodFilter } from '@/components/admin/PeriodFilter';
import { AdvanceSeasonForm } from '@/components/admin/AdminForms';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can, type Role } from '@/lib/auth/rbac';
import {
  getCommandCentre,
  isPeriod,
  PERIOD_LABEL,
  type Period,
} from '@/server/data/command-centre';
import { getSystemHealth } from '@/server/data/system-health';
import { greeting } from '@/lib/judging-nav';
import { STAGE_LABEL, type SeasonStage } from '@/domain/season';
import { formatDate } from '@/lib/format';
import {
  Users,
  Trophy,
  Workflow,
  Monitor,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Command centre',
  description: 'PALMA administration.',
  path: '/admin',
  noIndex: true,
});

export default async function CommandCentrePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await requirePermission('admin:view_dashboard', '/admin');
  const { period: raw } = await searchParams;
  const period = isPeriod(raw) ? raw : '30d';

  const firstName = session.user.name.split(' ')[0] ?? session.user.name;

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Monitor className="text-taupe size-4" strokeWidth={1.5} />
          <span className="palma-label text-taupe-deep">Command centre</span>
        </div>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          {greeting()}, {firstName}.
        </h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          Figures below cover{' '}
          <strong className="text-ink">{PERIOD_LABEL[period].toLowerCase()}</strong>.
        </p>
      </header>

      <div className="border-stone-deep mt-10 border-b pb-5">
        <PeriodFilter period={period} basePath="/admin" />
      </div>

      <Suspense
        fallback={
          <div className="mt-12 flex flex-col gap-14">
            <StatGridSkeleton title="Creators" count={8} />
            <StatGridSkeleton title="Awards" count={6} />
            <StatGridSkeleton title="Operations" count={6} />
            <StatGridSkeleton title="Platform" count={6} />
          </div>
        }
      >
        <Figures period={period} role={session.user.role} />
      </Suspense>
    </>
  );
}

async function Figures({ period, role }: { period: Period; role: Role }) {
  const [centre, health] = await Promise.all([
    getCommandCentre(period),
    can(role, 'admin:manage_system') ? getSystemHealth() : Promise.resolve(null),
  ]);

  const { creators, awards, operations, platform } = centre;

  const outstanding =
    operations.openClaims +
    operations.escalations +
    operations.verificationQueue +
    operations.reports;

  const degraded = health?.services.filter((service) => service.state !== 'operational') ?? [];

  return (
    <>
      <div className="mt-10 flex items-start gap-12">
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          {outstanding === 0
            ? 'Nothing is waiting on a person across the institution.'
            : `${outstanding} item${outstanding === 1 ? '' : 's'} across the queues need a decision.`}
          {centre.since ? ` Counted since ${formatDate(centre.since)}.` : ''}
        </p>
      </div>

      {degraded.length > 0 ? (
        <div className="border-olive/40 bg-olive/8 mt-8 flex items-start gap-3 border px-5 py-4">
          <AlertTriangle className="text-olive mt-0.5 size-4 shrink-0" strokeWidth={2} />
          <div className="text-olive text-sm leading-relaxed">
            <p className="palma-label mb-1">A service is not healthy</p>
            {degraded.map((service) => service.name).join(', ')}{' '}
            <Link href="/admin/health" className="palma-link text-ink font-medium">
              view system health
              <ChevronRight className="mb-0.5 inline size-3.5" />
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-12 flex flex-col gap-14">
        <StatGrid
          title="Creators"
          icon={Users}
          stats={[
            { label: 'Total records', value: creators.total, href: '/portal/creators' },
            { label: 'Added', value: creators.added, note: PERIOD_LABEL[period] },
            { label: 'Claimed', value: creators.claimed, href: '/portal/creators?filter=claimed' },
            { label: 'Unclaimed', value: creators.unclaimed, href: '/portal/creators?filter=unclaimed' },
            { label: 'Verified', value: creators.verified },
            { label: 'Verification pending', value: creators.verificationPending, tone: 'attention' },
            { label: 'Unpublished', value: creators.unpublished, href: '/portal/creators?filter=unpublished' },
            { label: 'Suspended', value: creators.suspended, tone: 'attention' },
          ]}
        />

        {awards ? (
          <StatGrid
            title={`Awards \u2014 ${awards.seasonTitle}, ${STAGE_LABEL[awards.stage as SeasonStage]}`}
            icon={Trophy}
            stats={[
              { label: 'Categories', value: awards.categories },
              { label: 'Nominations', value: awards.nominations, href: '/portal/nominations' },
              { label: 'Eligible', value: awards.eligible },
              { label: 'Finalists', value: awards.finalists, href: '/admin/selection' },
              { label: 'Winners', value: awards.winners, href: '/admin/selection' },
              {
                label: 'Awaiting finalisation',
                value: awards.awaitingFinalisation,
                note: 'Scored, no honour conferred',
                tone: 'attention',
                href: '/admin/selection',
              },
            ]}
          />
        ) : (
          <Notice tone="warning" title="No current season">
            No season is marked current. The queues still work; the season figures do not.
          </Notice>
        )}

        <StatGrid
          title="Operations"
          icon={Workflow}
          stats={[
            { label: 'Open claims', value: operations.openClaims, href: '/portal/claims', tone: 'attention' },
            { label: 'Escalations', value: operations.escalations, href: '/portal/claims?filter=escalated', tone: 'attention' },
            { label: 'Verification queue', value: operations.verificationQueue, href: '/portal/verification', tone: 'attention' },
            { label: 'Reports', value: operations.reports, href: '/portal/reports', tone: 'attention' },
            { label: 'Declared conflicts', value: operations.openConflicts, href: '/admin/judging' },
            { label: 'Assessments outstanding', value: operations.unassignedJudging, href: '/admin/judging' },
          ]}
        />

        <StatGrid
          title="Platform"
          icon={Monitor}
          stats={[
            { label: 'Accounts', value: platform.accounts, href: '/admin/users' },
            { label: 'New accounts', value: platform.newAccounts, note: PERIOD_LABEL[period] },
            { label: 'Active sessions', value: platform.activeSessions },
            { label: 'Nomination activity', value: platform.nominationActivity, note: PERIOD_LABEL[period] },
            { label: 'Claim activity', value: platform.claimActivity, note: PERIOD_LABEL[period] },
            { label: 'Audited events', value: platform.auditEvents, note: PERIOD_LABEL[period], href: '/admin/audit' },
          ]}
        />
      </div>

      {awards && can(role, 'admin:manage_seasons') ? (
        <section className="border-stone-deep mt-16 border-t pt-10">
          <div className="flex items-center gap-2.5 mb-6">
            <ChevronRight className="text-taupe size-4" strokeWidth={1.5} />
            <h3 className="palma-label text-taupe-deep">Advance the season</h3>
          </div>
          <div className="max-w-140">
            <AdvanceSeasonForm stage={awards.stage as SeasonStage} year={awards.seasonYear} />
          </div>
        </section>
      ) : null}
    </>
  );
}
