import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { requirePermission } from '@/lib/auth/guards';
import { recentActivity } from '@/server/data/people';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Activity',
  description: 'What PALMA has been doing.',
  path: '/admin/activity',
  noIndex: true,
});

/** Which surface a given audited entity is actually reachable on. */
function hrefFor(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'CreatorClaim':
      return `/portal/claims/${entityId}`;
    case 'User':
      return '/admin/users';
    case 'VerificationCase':
      return '/portal/verification';
    case 'ConsequentialAction':
      return '/admin/enforcement';
    default:
      return null;
  }
}

export default async function ActivityPage() {
  await requirePermission('admin:view_audit_log', '/admin/activity');
  const entries = await recentActivity(60);

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="palma-label text-taupe-deep">Command centre</span>
        <h1 className="text-4xl">Activity</h1>
        <p className="text-taupe-deep max-w-160 leading-relaxed">
          What PALMA&rsquo;s staff have actually done, newest first, drawn from the audit log rather
          than from a separate feed that could disagree with it. The{' '}
          <Link href="/admin/audit" className="palma-link text-ink">
            audit log
          </Link>{' '}
          itself is filterable and carries the before and after state.
        </p>
      </div>

      <ul className="mt-12 flex flex-col">
        {entries.map((entry) => {
          const href = hrefFor(entry.entityType, entry.entityId);

          const body = (
            <>
              <span className="palma-label text-taupe w-32 shrink-0">
                {formatDate(entry.createdAt)}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="palma-row-lead font-display text-lg">
                  {entry.action.replace(/[._]/g, ' ')}
                </span>
                <span className="text-taupe-deep text-sm leading-relaxed">
                  {entry.summary ?? `${entry.entityType} ${entry.entityId}`}
                </span>
                {entry.actor ? (
                  <span className="text-taupe text-xs break-all">{entry.actor}</span>
                ) : null}
              </span>
            </>
          );

          return (
            <li key={entry.id}>
              {href ? (
                <Link
                  href={href}
                  className="palma-row border-stone-deep flex flex-wrap gap-x-6 gap-y-1 border-b py-4"
                >
                  {body}
                </Link>
              ) : (
                <div className="border-stone-deep flex flex-wrap gap-x-6 gap-y-1 border-b py-4">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {entries.length === 0 ? (
        <p className="text-taupe mt-8 text-sm">Nothing has been recorded yet.</p>
      ) : null}
    </>
  );
}
