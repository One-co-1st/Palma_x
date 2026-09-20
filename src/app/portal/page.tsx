import Link from 'next/link';

import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { can } from '@/lib/auth/rbac';
import { getQueueCounts } from '@/server/data/operations';
import { recentActivity } from '@/server/data/people';
import { greeting } from '@/lib/judging-nav';
import { formatShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileCheck,
  ShieldAlert,
  Flag,
  AlertTriangle,
  FileText,
  ArrowRight,
  Clock,
  Info,
  ShieldOff,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Moderation',
  description: 'The PALMA moderation queues.',
  path: '/portal',
  noIndex: true,
});

const QUEUE_ICONS: Record<string, typeof FileCheck> = {
  '/portal/claims': FileCheck,
  '/portal/verification': ShieldAlert,
  '/portal/reports': Flag,
  '/portal/claims?filter=escalated': AlertTriangle,
  '/portal/creators?filter=unpublished': FileText,
};

export default async function ModerationOverviewPage() {
  const session = await requirePermission('operations:view_dashboard', '/portal');
  const [queues, activity] = await Promise.all([getQueueCounts(), recentActivity(8)]);

  const firstName = session.user.name.split(' ')[0] ?? session.user.name;

  const work = [
    {
      href: '/portal/claims',
      label: 'Creator claim requests',
      count: queues.claims,
      note: 'People asking to control a PALMA record.',
      visible: can(session.user.role, 'claims:review'),
    },
    {
      href: '/portal/verification',
      label: 'Manual age verification',
      count: queues.verification,
      note: 'Cases the provider could not settle.',
      visible: can(session.user.role, 'verification:review_manual'),
    },
    {
      href: '/portal/reports',
      label: 'Reports',
      count: queues.reports,
      note: 'Open and under investigation.',
      visible: can(session.user.role, 'moderation:view_reports'),
    },
    {
      href: '/portal/claims?filter=escalated',
      label: 'Escalations',
      count: queues.escalations,
      note: 'Handed up for an administrator.',
      visible: can(session.user.role, 'claims:review'),
    },
    {
      href: '/portal/creators?filter=unpublished',
      label: 'Records awaiting publication',
      count: queues.unpublishedRecords,
      note: 'Written by PALMA, not yet public.',
      visible: can(session.user.role, 'editorial:edit_creator'),
    },
  ].filter((item) => item.visible);

  const outstanding = work.reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="text-taupe size-4" strokeWidth={1.5} />
          <span className="palma-label text-taupe-deep">Moderation</span>
        </div>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          {greeting()}, {firstName}.
        </h1>
        <p className="text-taupe-deep max-w-160 text-lg leading-relaxed">
          {outstanding === 0
            ? 'Your queues are clear. Nothing is waiting on a person.'
            : `${outstanding} item${outstanding === 1 ? '' : 's'} need a decision.`}
        </p>
      </header>

      {outstanding > 0 ? (
        <div className="border-champagne-deep/60 bg-champagne/12 mt-8 flex items-center gap-3 px-5 py-3.5 text-sm">
          <Clock className="text-champagne-deep size-4 shrink-0" strokeWidth={2} />
          <span className="text-ink">
            <strong>{outstanding}</strong> outstanding {outstanding === 1 ? 'item requires' : 'items require'} your attention across the queues below.
          </span>
        </div>
      ) : null}

      <section className="mt-12">
        <h2 className="palma-label text-taupe-deep border-stone-deep border-b pb-4">
          Needs attention
        </h2>

        <ul className="flex flex-col">
          {work.map((item) => {
            const Icon = QUEUE_ICONS[item.href] ?? FileText;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="palma-row group border-stone-deep flex items-center gap-5 border-b py-6 transition-colors hover:bg-stone/10"
                >
                  <span
                    className={cn(
                      'flex size-12 shrink-0 items-center justify-center rounded-sm',
                      item.count > 0
                        ? 'bg-ink text-ivory'
                        : 'bg-stone/40 text-taupe',
                    )}
                  >
                    <span className="font-display text-xl tabular-nums">{item.count}</span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <Icon
                      className={cn(
                        'size-5',
                        item.count > 0 ? 'text-ink' : 'text-taupe',
                      )}
                      strokeWidth={1.5}
                    />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="palma-row-lead font-display text-lg">{item.label}</span>
                    <span className="text-taupe text-sm">{item.note}</span>
                  </span>
                  <ArrowRight
                    className="text-taupe ml-auto size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-16 grid gap-14 lg:grid-cols-12 lg:gap-16">
        <section className="min-w-0 lg:col-span-7">
          <div className="border-stone-deep flex items-center gap-2.5 border-b pb-3">
            <Clock className="text-taupe size-4" strokeWidth={1.5} />
            <h2 className="palma-label text-taupe-deep">Recently recorded</h2>
          </div>
          <ul className="flex flex-col">
            {activity.map((entry) => (
              <li
                key={entry.id}
                className="border-stone-deep/60 flex flex-wrap gap-x-5 gap-y-1 border-b py-4 last:border-none"
              >
                <span className="palma-label text-taupe w-24 shrink-0 text-[10px]">
                  {formatShortDate(entry.createdAt)}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-medium">{entry.action.replace(/[._]/g, ' ')}</span>
                  <span className="text-taupe text-xs leading-relaxed">
                    {entry.summary ?? `${entry.entityType} ${entry.entityId}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex min-w-0 flex-col gap-8 lg:col-span-5">
          <div className="border-stone-deep border p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <Info className="text-taupe size-4" strokeWidth={1.5} />
              <h3 className="palma-label text-taupe-deep">What this desk decides</h3>
            </div>
            <p className="text-taupe-deep text-sm leading-relaxed">
              Whether a person should control a PALMA record, whether a creator has been verified as
              an adult, and whether something reported breaches the content policy. Each decision is
              recorded against the thing it concerns, with your name on it.
            </p>
          </div>

          <div className="border-olive/40 bg-olive/8 border p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <ShieldOff className="text-olive size-4" strokeWidth={1.5} />
              <h3 className="palma-label text-olive">What it never decides</h3>
            </div>
            <p className="text-olive text-sm leading-relaxed">
              An outcome. Selection, revocation and score correction are administrator actions.
              Moderation maintains the accuracy of the record and never its results.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
